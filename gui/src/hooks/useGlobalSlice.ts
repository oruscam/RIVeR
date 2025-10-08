import { useSelector } from 'react-redux';
import { RootState } from '../store/store';

export const useGlobalSlice = () => {
  const global = useSelector((state: RootState) => state.global);

  return { ...global };
};
