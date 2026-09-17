import React from 'react';
import ReactDomClient from 'react-dom/client';
import {compose} from 'redux';

import AppStateHOC from '../lib/app-state-hoc.jsx';
import GUI from '../containers/gui.jsx';
import HashParserHOC from '../lib/hash-parser-hoc.jsx';

// Prototype/verification entry point for a gallery-style read-only project viewer. Unlike stock
// player.jsx, this points the storage layer at a configurable host instead of Scratch's own
// servers, since GUI's ProjectFetcherHOC (packages/scratch-gui/src/lib/project-fetcher-hoc.jsx)
// only reads projectHost/assetHost from props, and player.jsx never passes them.
const GALLERY_PROJECT_HOST = 'http://localhost:8601/gallery-test/projects';
const GALLERY_ASSET_HOST = 'http://localhost:8601/gallery-test/assets';

export default appTarget => {
    GUI.setAppElement(appTarget);

    const WrappedGui = compose(
        AppStateHOC,
        HashParserHOC
    )(GUI);

    const root = ReactDomClient.createRoot(appTarget);
    root.render(
        <WrappedGui
            isPlayerOnly
            projectHost={GALLERY_PROJECT_HOST}
            assetHost={GALLERY_ASSET_HOST}
        />
    );
};
