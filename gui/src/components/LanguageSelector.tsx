import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { GrLanguage } from 'react-icons/gr';
import { useUiSlice } from '../hooks';

export const LanguageSelector = () => {
  const { t, i18n } = useTranslation();
  const { language, onSetLanguage } = useUiSlice();

  const handleOnChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onSetLanguage(event.target.value);
  };

  useEffect(() => {
    i18n.changeLanguage(language);
  }, [language]);

  return (
    <div className='language-selector'>
      <GrLanguage className='language-selector-icon primary-color' />
      <select
        className='language-selector-select'
        value={language}
        onChange={handleOnChange}
      >
        <option value='en'>{t('MainPage.english')}</option>
        <option value='es'>{t('MainPage.spanish')}</option>
      </select>
    </div>
  );
};
