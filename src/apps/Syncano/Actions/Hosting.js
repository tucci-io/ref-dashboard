import _ from 'lodash';
import bluebird from 'bluebird';

let stopUploading = false;

export default {
  list() {
    this.NewLibConnection
      .Hosting
      .please()
      .list()
      .ordering('desc')
      .then(this.completed)
      .catch(this.failure);
  },

  create(params) {
    this.NewLibConnection
      .Hosting
      .please()
      .create(params)
      .then((createdHosting) => {
        if (params.is_default) {
          return this.NewLibConnection
            .Hosting
            .please()
            .setDefault({ id: createdHosting.id })
            .then(this.completed)
            .catch(this.failure);
        }
        return this.completed(createdHosting);
      })
      .catch(this.failure);
  },

  update(id, params) {
    this.NewLibConnection
      .Hosting
      .please()
      .update({ id }, params)
      .then((updatedHosting) => {
        if (params.is_default) {
          return this.NewLibConnection
            .Hosting
            .please()
            .setDefault({ id: updatedHosting.id })
            .then(this.completed)
            .catch(this.failure);
        }
        return this.completed(updatedHosting);
      })
      .catch(this.failure);
  },

  remove(items) {
    const promises = _.map(items, (item) => this.NewLibConnection.Hosting.please().delete({ id: item.id }));

    this.Promise
      .all(promises)
      .then(this.completed)
      .catch(this.failure);
  },

  cancelUploading() {
    stopUploading = true;
  },

  uploadFiles(hostingId, files) {
    const all = this.NewLibConnection.HostingFile.please().all({ hostingId }, { ordering: 'desc' });
    let cancelFileIndex = false;

    all.on('stop', (fetchedFiles) => {
      bluebird.mapSeries(files, (file, currentFileIndex) => {
        const lastFileIndex = files.length - 1;
        const isFinished = currentFileIndex === lastFileIndex;
        const fileToUpdate = _.find(fetchedFiles, { path: file.path });
        const payload = { file: this.NewLibConnection.file(file), path: file.path };
        const errorCallback = ({ errors, message }) => {
          this.failure(
            {
              isFinished,
              currentFileIndex
            },
            {
              file,
              errors,
              message
            }
          );
        };

        if (stopUploading) {
          if (currentFileIndex === lastFileIndex) {
            stopUploading = false;
            return this.completed({
              isFinished: true,
              isCanceled: true,
              currentFileIndex: cancelFileIndex,
              lastFileIndex: cancelFileIndex
            });
          }
          if (!cancelFileIndex) {
            cancelFileIndex = currentFileIndex;
          }
          return true;
        }

        if (fileToUpdate) {
          return this.NewLibConnection
            .HostingFile
            .please()
            .update({ id: fileToUpdate.id, hostingId }, payload)
            .then(() => this.completed({
              isFinished,
              currentFileIndex
            }))
            .catch(errorCallback);
        }

        return this.NewLibConnection
          .HostingFile
          .please()
          .upload({ hostingId }, payload)
          .then(() => this.completed({
            isFinished,
            currentFileIndex
          }))
          .catch(errorCallback);
      });
    });
  },

  listFiles(hostingId) {
    const data = {};
    const all = this.NewLibConnection.HostingFile.please().all({ hostingId }, { ordering: 'desc' });

    all.on('stop', (files) => {
      data.files = files;

      this.NewLibConnection
        .Hosting
        .please()
        .get({ id: hostingId })
        .then((hostingDetails) => {
          data.hostingDetails = hostingDetails;

          this.completed(data);
        })
        .catch(this.failure);
    });
  },

  removeFiles(files, hostingId) {
    const lastFileIndex = files.length - 1;

    bluebird.mapSeries(files, (file, currentFileIndex) => {
      const hasNextFile = files.length > currentFileIndex + 1;

      return this.NewLibConnection
        .HostingFile
        .please()
        .delete({ hostingId, id: file.id })
        .then(() => this.completed({
          isFinished: !hasNextFile,
          currentFileIndex,
          lastFileIndex
        }))
        .catch(this.failure);
    });
  },

  publish(id) {
    this.NewLibConnection
      .Hosting
      .please()
      .setDefault({ id })
      .then(this.completed)
      .catch(this.failure);
  }
};
