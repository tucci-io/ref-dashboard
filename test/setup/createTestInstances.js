import createConnection from './create/connection';
import firstInstance from './profile/firstInstance';
import secondInstance from './profile/secondInstance';
import thirdInstance from './profile/thirdInstance';

import checkAvailableSlots from './helpers/checkAvailableSlots';

import getCertificate from './files/getCertificate';
import exportTestInstances from './files/exportTestInstances';

const instances = {};

if (process.env.CI) getCertificate();

createConnection.init()
  .then((accountConnection) => {
    instances.account = accountConnection;
  })
  .then(checkAvailableSlots)
  .then(firstInstance)
  .then((firstCreatedInstance) => {
    instances.firstInstance = firstCreatedInstance;
  })
  .then(secondInstance)
  .then((secondCreatedInstance) => {
    instances.secondInstance = secondCreatedInstance;
  })
  .then(thirdInstance)
  .then((thirdCreatedInstance) => {
    instances.thirdInstance = thirdCreatedInstance;
  })
  .then(() => {
    console.log('\nAccount details for debugging:\n', instances);
    exportTestInstances(instances);
  })
  .catch((error) => console.error(error));
