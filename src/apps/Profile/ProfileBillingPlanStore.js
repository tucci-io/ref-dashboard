import Reflux from 'reflux';
import Moment from 'moment';
import _ from 'lodash';

import { PricingPlansUtil } from '../../utils';
import { SnackbarNotificationMixin, StoreLoadingMixin } from '../../mixins';

import ProfileBillingPlanActions from './ProfileBillingPlanActions';

export default Reflux.createStore({
  listenables: ProfileBillingPlanActions,

  mixins: [
    SnackbarNotificationMixin,
    StoreLoadingMixin
  ],

  getInitialState() {
    return {
      profile: null,
      usage: null,
      overage: {
        amount: 0
      },
      subscriptions: null,
      isReady: false,
      isLoading: true,
      chartLegend: {
        rows: [],
        showPercents: false
      }
    };
  },

  init() {
    this.data = this.getInitialState();
    this.setLoadingStates();
  },

  clearData() {
    this.data = this.getInitialState();
    this.trigger(this.data);
  },

  refreshData() {
    const join = this.joinTrailing(
      ProfileBillingPlanActions.fetchBillingProfile.completed,
      ProfileBillingPlanActions.fetchBillingSubscriptions.completed,
      () => {
        join.stop();
        this.data.isReady = true;
        this.data.isLoading = false;
        this.trigger(this.data);
      }
    );

    ProfileBillingPlanActions.fetchBillingProfile();
    ProfileBillingPlanActions.fetchBillingSubscriptions();
  },

  setProfile(profile) {
    this.data.profile = profile;
    this.data.soft_limit = profile.soft_limit;
    this.data.hard_limit = profile.hard_limit;
    this.trigger(this.data);
  },

  setUsage(usage) {
    this.data.usage = usage;
  },

  setSubscriptions(subscriptions) {
    this.data.subscriptions = subscriptions;
    this.trigger(this.data);
  },

  getProfileStatus() {
    if (!this.data.profile) {
      return null;
    }

    return this.data.profile.status;
  },

  getActiveSubscriptionEndDate() {
    const activeSubscription = _.last(this.data.subscriptions);

    return activeSubscription && activeSubscription.end;
  },

  isNewSubscription() {
    const { subscriptions } = this.data;

    if (!subscriptions || subscriptions.length < 2) {
      return false;
    }

    const lastSubscription = _.last(subscriptions);

    if (_.isString(lastSubscription.start) && !_.isString(lastSubscription.end)) {
      return true;
    }

    return false;
  },

  isNewSubscriptionSame() {
    const { subscriptions } = this.data;

    if (!subscriptions || !this.isNewSubscription()) {
      return false;
    }

    const newPricing = _.last(subscriptions).pricing;
    const currentPricing = this.getCurrentPlanPricing();

    if (_.isEmpty(newPricing) || _.isEmpty(currentPricing)) {
      return false;
    }

    const newPricingAPI = newPricing.api.included;
    const currentPricingAPI = currentPricing.api.included;
    const newPricingCBX = newPricing.cbx.included;
    const currentPricingCBX = currentPricing.cbx.included;

    if (newPricingAPI === currentPricingAPI && newPricingCBX === currentPricingCBX) {
      return true;
    }

    return false;
  },

  isNewSubscriptionVisible() {
    return (this.isNewSubscription() && !this.isNewSubscriptionSame());
  },

  isPlanCanceled() {
    const { subscriptions } = this.data;
    const lastSubscription = _.last(subscriptions);

    if (this.isNewSubscription() || _.isEmpty(subscriptions)) {
      return false;
    }

    const { start, end } = lastSubscription;

    if (_.isString(start) && _.isString(end) && Moment(end).diff(new Date(), 'days') < 31) {
      return true;
    }

    return false;
  },

  getBuilderLimits() {
    return {
      api: { included: '100000' },
      cbx: { included: '20000' }
    };
  },

  getPlan() {
    if (!this.data.profile || !this.data.profile.subscription) {
      return null;
    }

    return this.data.profile.subscription.plan;
  },

  getPricingPlanKey() {
    if (!this.data.profile) {
      return null;
    }

    if (!this.data.profile.subscription || !this.data.profile.subscription.pricing.api) {
      return PricingPlansUtil.getPlanKey();
    }

    const apiLimit = this.data.profile.subscription.pricing.api.included;

    return PricingPlansUtil.getPlanKey(apiLimit);
  },

  getLimitsData(subscription, plan) {
    if (plan === 'builder') {
      return this.getBuilderLimits();
    }

    let pricing = null;

    if (!subscription || subscription === 'default') {
      pricing = this.data.profile.subscription.pricing;
    } else {
      pricing = subscription.pricing;
    }

    return ({
      api: {
        included: pricing.api.included,
        overage: pricing.api.overage
      },
      cbx: {
        included: pricing.cbx.included,
        overage: pricing.cbx.overage
      }
    });
  },

  setOverage(payload) {
    this.data.overage = payload;
    this.trigger(this.data);
  },

  getOverage() {
    return this.data.overage;
  },

  getCurrentPlanValue(type) {
    if (!this.data.profile || !this.data.profile.subscription) {
      return null;
    }

    if (_.isEmpty(this.data.profile)) {
      return null;
    }

    const { commitment } = this.data.profile.subscription;

    if (_.isEmpty(commitment)) {
      return 0;
    }

    return parseInt(commitment[type], 10);
  },

  getNewPlanValue(type) {
    if (!this.isNewSubscription()) {
      return null;
    }

    if (!this.data.subscriptions) {
      return null;
    }

    const newSubscription = _.last(this.data.subscriptions);
    const { commitment } = newSubscription;

    return parseInt(commitment[type], 10);
  },

  getPlanTotalValue(subscription) {
    if (!this.data.profile || !this.data.profile.subscription) {
      return null;
    }

    let commitment = this.data.profile.subscription.commitment;

    if (subscription) {
      commitment = subscription.commitment;
    }

    return parseInt(commitment.api, 10) + parseInt(commitment.cbx, 10);
  },

  getNewPlanTotalValue() {
    if (!this.isNewSubscription()) {
      return null;
    }

    if (!this.data.subscriptions) {
      return null;
    }

    const newSubscription = _.last(this.data.subscriptions);

    return this.getPlanTotalValue(newSubscription);
  },

  getCurrentPlanPricing() {
    if (!this.data.profile) {
      return null;
    }

    return this.data.profile.subscription.pricing;
  },

  onFetchBillingProfileCompleted(payload) {
    this.setProfile(payload);
  },

  onFetchBillingSubscriptionsCompleted(payload) {
    this.setSubscriptions(payload);
  },

  onCancelSubscriptionsCompleted() {
    this.data.hideDialogs = true;
    this.refreshData();
    this.setSnackbarNotification({
      message: 'Your plan has been canceled successfully.'
    });
  },

  onSubscribePlanCompleted() {
    this.data.hideDialogs = true;
    this.refreshData();
  },

  onUpdateBillingProfileCompleted(payload) {
    this.setProfile(payload);
    this.setSnackbarNotification({
      message: 'Your new settings have been updated successfully.'
    });
  },

  setChartLegend(payload) {
    this.data.chartLegend = payload;
    this.trigger(this.data);
  },

  onCancelSubscriptionRequestCompleted() {
    this.data.cancelSubscriptionRequest = 'done';
    this.trigger(this.data);
  },

  onCancelSubscriptionRequestFailure() {
    this.data.cancelSubscriptionRequest = 'error';
    this.trigger(this.data);
  }
});
