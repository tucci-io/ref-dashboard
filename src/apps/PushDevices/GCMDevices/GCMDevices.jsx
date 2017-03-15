import React from 'react';
import Reflux from 'reflux';
import Helmet from 'react-helmet';
import { withRouter } from 'react-router';

import Store from './GCMDevicesStore';
import Actions from './GCMDevicesActions';

import { Container } from '../../../common/';
import DevicesList from '../DevicesList';
import GCMDevicesEmptyView from './GCMDevicesEmptyView';
import GCMNoConfigEmptyView from './GCMNoConfigEmptyView';
import GCMSummaryDialog from '../../PushNotifications/GCM/GCMSummaryDialog';

const GCMDevices = React.createClass({

  displayName: 'GCMDevices',

  mixins: [
    Reflux.connect(Store)
  ],

  componentDidMount() {
    Actions.fetch();
  },

  getDefaultProps() {
    return {
      titleVisible: true,
      noConfigView: <GCMNoConfigEmptyView />,
      emptyView: <GCMDevicesEmptyView />
    };
  },

  shouldShowTitle() {
    const { titleVisible, routes } = this.props;
    const { hasConfig, hasItems } = this.state;
    const currentRouteName = routes[routes.length - 1].name;

    if (currentRouteName !== 'all-push-notification-devices') {
      return hasConfig && hasItems;
    }

    return titleVisible;
  },

  render() {
    const { hideDialogs, isLoading, items, hasConfig, ...other } = this.state;
    const { visibleItems, emptyView, noConfigView, routes } = this.props;
    const currentRouteName = routes[routes.length - 1].name;
    const isSingleView = currentRouteName !== 'all-push-notification-devices';

    return (
      <Container>
        {isSingleView && <Helmet title="Android Devices" />}
        <GCMSummaryDialog />
        <DevicesList
          titleVisible={this.shouldShowTitle()}
          emptyView={emptyView}
          noConfigView={noConfigView}
          type="gcm"
          hasConfig={hasConfig}
          visibleItems={visibleItems}
          getCheckedItems={Store.getCheckedItems}
          actions={Actions}
          emptyItemHandleClick={Actions.showDialog}
          emptyItemContent="Add GCM Device"
          hideDialogs={hideDialogs}
          isLoading={isLoading}
          items={items}
          {...other}
        />
      </Container>
    );
  }
});

export default withRouter(GCMDevices);
