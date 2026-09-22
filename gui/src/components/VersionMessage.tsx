import { useUiSlice } from '../hooks';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../constants/constants';

const SOURCE_URL = 'https://github.com/oruscam/RIVeR';

export const VersionMessage = () => {
  const { isLatestVersion, latestVersion } = useUiSlice();
  const { t } = useTranslation();

  const latestLink = `https://github.com/oruscam/RIVeR/releases/tag/v${latestVersion}`;
  const versionMessage = isLatestVersion ? 'latest' : 'update';

  return (
    <div id="version-block">
      <div id="version-message">
        <span id="version-number">{import.meta.env.VITE_APP_VERSION}</span>
        {isLatestVersion !== undefined && (
          <>
            <span id="version-dot" data-status={isLatestVersion ? 'ok' : 'update'} aria-hidden="true" />
            <p style={{ color: isLatestVersion === false ? COLORS.RED : '' }}>
              {t(`MainPage.Version.${versionMessage}`, {
                defaultValue: isLatestVersion ? 'Up to date' : 'Update available',
              })}
            </p>
            {isLatestVersion === false && (
              <a href={latestLink} target="_blank" rel="noopener noreferrer" style={{ color: COLORS.RED }}>
                {' '}
                {latestVersion}{' '}
              </a>
            )}
          </>
        )}
      </div>
      {/* AGPL-3.0 requires that recipients of a binary can reach the
          corresponding source. Keep this link reachable from the app. */}
      <a id="source-offer" href={SOURCE_URL} target="_blank" rel="noopener noreferrer">
        {t('MainPage.Version.source')}
      </a>
    </div>
  );
};
