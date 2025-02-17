import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GrLanguage } from 'react-icons/gr';

export const LanguageSelector = () => {
  const { t, i18n } = useTranslation();
  const [selected, setSelected] = useState('en');

  const handleOnChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelected(event.target.value);
  };

  useEffect(() => {
    i18n.changeLanguage(selected);
  }, [selected]);

  return (
    <div className='language-selector'>
      <GrLanguage className='language-selector-icon primary-color' />
      <select
        className='language-selector-select'
        value={selected}
        onChange={handleOnChange}
      >
        <option value='en'>{t('MainPage.english')}</option>
        <option value='es'>{t('MainPage.spanish')}</option>
      </select>
    </div>
  );
};
