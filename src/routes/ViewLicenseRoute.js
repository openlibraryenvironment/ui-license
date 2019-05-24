import React from 'react';
import PropTypes from 'prop-types';
import { get, difference } from 'lodash';

import { stripesConnect } from '@folio/stripes/core';

import View from '../components/License';

import { handleDownloadFile } from './handlers/file';

class ViewLicenseRoute extends React.Component {
  static manifest = Object.freeze({
    license: {
      type: 'okapi',
      path: 'licenses/licenses/:{id}',
    },
    linkedAgreements: {
      type: 'okapi',
      path: 'licenses/licenses/:{id}/linkedAgreements',
      params: {
        sort: 'owner.startDate;desc'
      },
      throwErrors: false,
    },
    terms: {
      type: 'okapi',
      path: 'licenses/custprops',
      shouldRefresh: () => false,
    },
    users: {
      type: 'okapi',
      path: '/users',
      fetch: false,
      accumulate: true,
      shouldRefresh: () => false,
    },
    query: {},
  });

  static propTypes = {
    history: PropTypes.shape({
      push: PropTypes.func.isRequired,
    }).isRequired,
    location: PropTypes.shape({
      pathname: PropTypes.string.isRequired,
      search: PropTypes.string.isRequired,
    }).isRequired,
    mutator: PropTypes.shape({
      query: PropTypes.shape({
        update: PropTypes.func.isRequired,
      }).isRequired,
    }).isRequired,
    resources: PropTypes.shape({
      linkedAgreements: PropTypes.object,
      license: PropTypes.object,
      terms: PropTypes.object,
      users: PropTypes.object,
    }).isRequired,
    stripes: PropTypes.shape({
      hasPerm: PropTypes.func.isRequired,
      okapi: PropTypes.object.isRequired,
    }).isRequired,
  };

  componentDidMount() {
    const contacts = get(this.props.resources, 'license.records[0].contacts', []);
    if (contacts.length) {
      this.fetchUsers(contacts);
    }
  }

  componentDidUpdate(prevProps) {
    const prevLicense = get(prevProps.resources, 'license.records[0]', {});
    const currLicense = get(this.props.resources, 'license.records[0]', {});
    const prevContacts = prevLicense.contacts || [];
    const currContacts = currLicense.contacts || [];
    const newContacts = difference(currContacts, prevContacts);
    if (prevLicense.id !== currLicense.id || newContacts.length) {
      this.fetchUsers(newContacts);
    }
  }

  fetchUsers = (newContacts) => {
    const { mutator } = this.props;
    newContacts.forEach(contact => mutator.users.GET({ path: `users/${contact.user}` }));
  }

  getLicenseContacts = () => {
    const { resources } = this.props;
    const contacts = get(resources, 'license.records[0].contacts', []);
    return contacts.map(contact => ({
      ...contact,
      user: get(resources, 'users.records', []).find(u => u.id === contact.user) || { personal: {} },
    }));
  }

  handleDownloadFile = (file) => {
    handleDownloadFile(file, this.props.stripes.okapi);
  }

  handleClose = () => {
    this.props.history.push(`/licenses${this.props.location.search}`);
  }

  handleTogglerHelper = (helper) => {
    const { mutator, resources } = this.props;
    const currentHelper = resources.query.helper;
    const nextHelper = currentHelper !== helper ? helper : null;

    mutator.query.update({ helper: nextHelper });
  }

  render() {
    const { location, resources, stripes } = this.props;

    return (
      <View
        data={{
          license: {
            ...get(resources, 'license.records[0]', {}),
            contacts: this.getLicenseContacts(),
            linkedAgreements: get(resources, 'linkedAgreements.records', []),
          },
          terms: get(resources, 'terms.records', []),
        }}
        editUrl={stripes.hasPerm('ui-licenses.licenses.edit') && `${location.pathname}/edit${location.search}`}
        handlers={{
          onDownloadFile: this.handleDownloadFile,
        }}
        isLoading={get(resources, 'license.isPending')}
        onClose={this.handleClose}
        onToggleHelper={this.handleTogglerHelper}
      />
    );
  }
}

export default stripesConnect(ViewLicenseRoute);
