/**
 * SDKEvents
 * @type {Array}
 */
const SDKEvents = [
    'SDK_READY',
    'SDK_ERROR',
    'SDK_GAME_START',
    'SDK_GAME_PAUSE',
    'SDK_GDPR_TRACKING',
    'SDK_GDPR_TARGETING',
    'SDK_GDPR_THIRD_PARTY',
    'AD_SDK_MANAGER_READY',
    'AD_SDK_CANCELED',
    'AD_IS_ALREADY_RUNNING',
];

/**
 * IMAEvents
 * @type {Array}
 */
const IMAEvents = [
    'AD_ERROR',
    'AD_BREAK_READY',
    'AD_METADATA',
    'ALL_ADS_COMPLETED',
    'CLICK',
    'COMPLETE',
    'CONTENT_PAUSE_REQUESTED',
    'CONTENT_RESUME_REQUESTED',
    'DURATION_CHANGE',
    'FIRST_QUARTILE',
    'IMPRESSION',
    'INTERACTION',
    'LINEAR_CHANGED',
    'LOADED',
    'LOG',
    'MIDPOINT',
    'PAUSED',
    'RESUMED',
    'SKIPPABLE_STATE_CHANGED',
    'SKIPPED',
    'STARTED',
    'THIRD_QUARTILE',
    'USER_CLOSE',
    'VOLUME_CHANGED',
    'VOLUME_MUTED',
];

export {
    SDKEvents,
    IMAEvents,
};
