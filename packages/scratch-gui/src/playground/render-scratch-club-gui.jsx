import React from 'react';
import ReactDomClient from 'react-dom/client';
import {compose} from 'redux';

import AppStateHOC from '../lib/app-state-hoc.jsx';
import GUI from '../containers/gui.jsx';
import HashParserHOC from '../lib/hash-parser-hoc.jsx';
import {loadCustomAssetLibrary} from '../lib/custom-asset-library.js';
import {setDynamicAssets} from '../reducers/dynamic-assets.js';

// Standalone entry point for a self-hosted deployment with no Scratch account/community backend.
// Deliberately omits `showComingSoon`, `username`, `canShare`, `canRemix`, and `enableCommunity` so
// menu-bar.jsx renders none of the account/community UI (it only appears when those props are set).
// `canSave={false}` disables server-project save/share; projects are saved via the File menu's
// local .sb3 download/upload instead.
export default appTarget => {
    GUI.setAppElement(appTarget);

    const WrappedGui = compose(
        AppStateHOC,
        HashParserHOC
    )(GUI);

    if (process.env.NODE_ENV === 'production' && typeof window === 'object') {
        window.onbeforeunload = () => true;
    }

    const root = ReactDomClient.createRoot(appTarget);
    const guiRef = React.createRef();

    root.render(
        <WrappedGui
            ref={guiRef}
            canEditTitle
            canSave={false}
        />
    );

    // Runs after mount in practice, since it waits on a network fetch; if the custom asset repo
    // is unreachable this resolves to empty lists and the stock library is unaffected.
    loadCustomAssetLibrary().then(dynamicAssets => {
        guiRef.current.appState.dispatch(setDynamicAssets(dynamicAssets));
    });
};
