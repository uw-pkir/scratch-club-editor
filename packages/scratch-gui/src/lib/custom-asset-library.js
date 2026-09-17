import md5 from 'js-md5';

import {legacyConfig} from '../legacy-config';

// Loads a class's custom sprite/costume/backdrop/sound library from a separate GitHub repo at
// runtime (no rebuild needed to add assets) and merges it into the stock Scratch library.
//
// How it works:
// - Files are listed via jsDelivr's GitHub-backed API and served from jsDelivr's CDN, so there's
//   no GitHub API rate limit to worry about at classroom scale, and no manifest file to maintain —
//   the filename in the repo IS the entry (see that repo's README for the folder convention).
// - Costume/backdrop/sprite thumbnails and stage rendering need rotationCenterX/Y, which normally
//   come from a hand-authored library JSON; here they're derived from the image's own pixel size.
// - Adding a sprite goes through VM.addSprite, which validates the whole object against the SB3
//   project schema — that schema requires assetId to look like a real MD5 (32 hex chars), so
//   readable IDs aren't legal here; assetIdFor hashes a stable string instead. The storage helper
//   registered below matches by exact lookup in its own map, so this never needs to be
//   distinguishable from a real Scratch md5 the way a prefixed ID would.

const CUSTOM_ASSETS_REPO = 'uw-pkir/scratch-club-assets';
const CUSTOM_ASSETS_BRANCH = 'main';

const CDN_BASE = `https://cdn.jsdelivr.net/gh/${CUSTOM_ASSETS_REPO}@${CUSTOM_ASSETS_BRANCH}`;
const LISTING_URL = `https://data.jsdelivr.com/v1/packages/gh/${CUSTOM_ASSETS_REPO}@${CUSTOM_ASSETS_BRANCH}?structure=flat`;

const IMAGE_ASSET_TYPE_BY_EXT = {
    png: 'ImageBitmap',
    jpg: 'ImageBitmap',
    jpeg: 'ImageBitmap',
    svg: 'ImageVector'
};
const SOUND_EXTENSIONS = new Set(['mp3', 'wav']);

const extensionOf = filename => (filename.split('.').pop() || '').toLowerCase();
const slugOf = filename => filename.replace(/\.[^./]+$/, '');
const nameFromSlug = slug => slug
    .replace(/[-_]+/g, ' ')
    .trim()
    .replace(/\b\w/g, char => char.toUpperCase()) || slug;

// Deterministic (same file always gets the same ID) but not derived from the file's own contents,
// since we don't have those up front — derived from its repo path instead.
const assetIdFor = path => md5(`scratch-club-assets:${path}`);

// SVGs and bitmaps alike report their natural pixel size once loaded; falls back to the Scratch
// stage size if a file can't be decoded (e.g. malformed upload) rather than failing the whole load.
const getImageDimensions = url => new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve({
        width: img.naturalWidth || 480,
        height: img.naturalHeight || 360
    });
    img.onerror = () => resolve({width: 480, height: 360});
    img.src = url;
});

const buildImageEntry = async path => {
    const filename = path.split('/').pop();
    const ext = extensionOf(filename);
    const assetType = IMAGE_ASSET_TYPE_BY_EXT[ext];
    if (!assetType) return null;

    const slug = slugOf(filename);
    const assetId = assetIdFor(path);
    const url = `${CDN_BASE}${path}`;
    const {width, height} = await getImageDimensions(url);

    return {
        name: nameFromSlug(slug),
        assetId,
        md5ext: `${assetId}.${ext}`,
        dataFormat: ext,
        bitmapResolution: 1,
        rotationCenterX: Math.round(width / 2),
        rotationCenterY: Math.round(height / 2),
        rawURL: url,
        tags: ['custom'],
        isPublic: true,
        _assetType: assetType,
        _url: url
    };
};

// A file directly in sprites/ becomes a one-costume sprite (unchanged from before). A file in a
// sprites/<name>/ subfolder is grouped with its siblings in that same subfolder into one sprite
// named <name>, with each file becoming one costume, in filename order — so "1-walk-a.png",
// "2-walk-b.png" gives a two-costume walk cycle, the same shape as Scratch Cat's own costumes.
// Only one level of subfolder is recognized; anything nested deeper is treated as part of the
// filename rather than creating further grouping.
const groupSpritePaths = paths => {
    const groups = new Map();
    paths.forEach(path => {
        const [firstSegment, ...rest] = path.slice('/sprites/'.length).split('/');
        const isGrouped = rest.length > 0;
        const groupKey = isGrouped ? firstSegment : path;
        const name = nameFromSlug(isGrouped ? firstSegment : slugOf(firstSegment));

        if (!groups.has(groupKey)) groups.set(groupKey, {name, paths: []});
        groups.get(groupKey).paths.push(path);
    });

    return Array.from(groups.values()).map(group => ({
        name: group.name,
        paths: group.paths.slice().sort()
    }));
};

const buildSoundEntry = path => {
    const filename = path.split('/').pop();
    const ext = extensionOf(filename);
    if (!SOUND_EXTENSIONS.has(ext)) return null;

    const slug = slugOf(filename);
    const assetId = assetIdFor(path);
    const url = `${CDN_BASE}${path}`;

    return {
        name: nameFromSlug(slug),
        assetId,
        md5ext: `${assetId}.${ext}`,
        dataFormat: ext,
        // Real duration isn't known without decoding the audio; Scratch only uses these for
        // display purposes, so a placeholder doesn't affect playback.
        rate: 44100,
        sampleCount: 0,
        tags: ['custom'],
        isPublic: true,
        _assetType: 'Sound',
        _url: url
    };
};

// Registers a scratch-storage web store that resolves our custom assetIds to their jsDelivr URL.
// Returning null/undefined for any assetId it doesn't recognize makes it a no-op for every other
// asset, so Scratch's own store (registered separately) keeps handling everything else unchanged.
const registerCustomAssetStore = assetEntries => {
    const storage = legacyConfig.storage.scratchStorage;
    const urlByAssetId = new Map(assetEntries.map(entry => [entry.assetId, entry._url]));

    storage.addWebStore(
        [storage.AssetType.ImageBitmap, storage.AssetType.ImageVector, storage.AssetType.Sound],
        asset => urlByAssetId.get(asset.assetId) || null
    );
};

/**
 * Fetch the custom asset repo's file listing and build the dynamic asset lists GUI expects.
 * Resolves to `{sprites, costumes, sounds, backdrops}`, each possibly empty (e.g. if the repo
 * doesn't exist yet, or the fetch fails — this never rejects, so it can't block editor startup).
 */
export const loadCustomAssetLibrary = async () => {
    const empty = {sprites: [], costumes: [], sounds: [], backdrops: []};

    let files;
    try {
        const response = await fetch(LISTING_URL);
        if (!response.ok) return empty;
        ({files} = await response.json());
    } catch {
        return empty;
    }

    const pathsIn = folder => files
        .map(file => file.name)
        .filter(path => path.startsWith(`/${folder}/`));

    const spriteGroups = groupSpritePaths(pathsIn('sprites'));

    const [costumeFiles, backdropFiles, spriteCostumeLists] = await Promise.all([
        Promise.all(pathsIn('costumes').map(buildImageEntry)),
        Promise.all(pathsIn('backdrops').map(buildImageEntry)),
        Promise.all(spriteGroups.map(group => Promise.all(group.paths.map(buildImageEntry))))
    ]);
    const soundFiles = pathsIn('sounds').map(buildSoundEntry);

    const costumes = costumeFiles.filter(Boolean);
    const backdrops = backdropFiles.filter(Boolean);
    const sounds = soundFiles.filter(Boolean);
    const sprites = spriteGroups
        .map((group, i) => ({group, spriteCostumes: spriteCostumeLists[i].filter(Boolean)}))
        .filter(({spriteCostumes}) => spriteCostumes.length > 0)
        .map(({group, spriteCostumes}) => ({
            name: group.name,
            tags: ['custom'],
            isStage: false,
            variables: {},
            blocks: {},
            costumes: spriteCostumes,
            sounds: []
        }));
    const spriteCostumes = spriteCostumeLists.flat().filter(Boolean);

    registerCustomAssetStore([...costumes, ...backdrops, ...sounds, ...spriteCostumes]);

    return {sprites, costumes, sounds, backdrops};
};
