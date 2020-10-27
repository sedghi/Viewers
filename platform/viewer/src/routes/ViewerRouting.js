import React from 'react';
import PropTypes from 'prop-types';
import { utils, user } from '@ohif/core';
//
import ConnectedViewerRetrieveStudyData from '../connectedComponents/ConnectedViewerRetrieveStudyData';
import useServer from '../customHooks/useServer';
import useQuery from '../customHooks/useQuery';
const { urlUtil: UrlUtil } = utils;

/**
 * Get array of seriesUIDs from param or from queryString
 * @param {*} seriesInstanceUIDs
 * @param {*} location
 */
const getSeriesInstanceUIDs = (seriesInstanceUIDs, routeLocation) => {
  const queryFilters = UrlUtil.queryString.getQueryFilters(routeLocation);
  const querySeriesUIDs = queryFilters && queryFilters['seriesInstanceUID'];
  const _seriesInstanceUIDs = seriesInstanceUIDs || querySeriesUIDs;

  return UrlUtil.paramString.parseParam(_seriesInstanceUIDs);
};
const getSOPInstanceUIDs = (SOPInstanceUIDs, routeLocation) => {
  const queryFilters = UrlUtil.queryString.getQueryFilters(routeLocation);
  const querySOPUIDs = queryFilters && queryFilters['SOPInstanceUID'];
  const _sopInstanceUIDs = SOPInstanceUIDs || querySOPUIDs;

  return UrlUtil.paramString.parseParam(_sopInstanceUIDs);
};

function ViewerRouting({ match: routeMatch, location: routeLocation }) {
  const {
    project,
    location,
    dataset,
    dicomStore,
    studyInstanceUIDs,
    seriesInstanceUIDs,
    SOPInstanceUIDs,
  } = routeMatch.params;

  // Set the user's default authToken for outbound DICOMWeb requests.
  // Is only applied if target server does not set `requestOptions` property.
  //
  // See: `getAuthorizationHeaders.js`
  let query = useQuery();
  const authToken = query.get('token');

  if (authToken) {
    user.getAccessToken = () => authToken;
  }

  const server = useServer({ project, location, dataset, dicomStore });
  const studyUIDs = UrlUtil.paramString.parseParam(studyInstanceUIDs);
  const seriesUIDs = getSeriesInstanceUIDs(seriesInstanceUIDs, routeLocation);
  const sopInstanceUIDs = getSOPInstanceUIDs(SOPInstanceUIDs, routeLocation);

  if (server && studyUIDs) {
    return (
      <ConnectedViewerRetrieveStudyData
        studyInstanceUIDs={studyUIDs}
        seriesInstanceUIDs={seriesUIDs}
        sopInstanceUIDs={sopInstanceUIDs}
      />
    );
  }

  return null;
}

ViewerRouting.propTypes = {
  match: PropTypes.shape({
    params: PropTypes.shape({
      studyInstanceUIDs: PropTypes.string.isRequired,
      seriesInstanceUIDs: PropTypes.string,
      dataset: PropTypes.string,
      dicomStore: PropTypes.string,
      location: PropTypes.string,
      project: PropTypes.string,
    }),
  }),
  location: PropTypes.any,
};

export default ViewerRouting;
