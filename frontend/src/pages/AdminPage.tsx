import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import LayoutBuilder from '../components/admin/LayoutBuilder';
import * as reservationApi from '../api/reservationApi';
import { useLayoutStore } from '../store/layoutStore';

export default function AdminPage() {
  const { t } = useTranslation();

  useEffect(() => {
    reservationApi.getReservations({}).then((data) => {
      useLayoutStore.getState().setReservations(data);
    });
  }, []);

  return (
    <div className="flex flex-col gap-4 p-6 flex-1 h-[calc(100vh-57px)]">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{t('page.layoutBuilder')}</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {t('page.layoutBuilderSubtitle')}
        </p>
      </div>
      <div className="flex-1 overflow-hidden">
        <LayoutBuilder />
      </div>
    </div>
  );
}
