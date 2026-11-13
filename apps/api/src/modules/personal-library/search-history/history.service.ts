import type { HistoryRepository, SearchHistoryInput } from './history.types';
import { SearchError, type Principal } from '../../../shared/search-context';
export function createHistoryService(repository: HistoryRepository, now = () => new Date()) {
  return {async save(input: SearchHistoryInput,key: string,principal: Principal) {
    if(!principal)throw new SearchError(401,'AUTH_REQUIRED','Cần đăng nhập để lưu lịch sử tài khoản.');
    return repository.saveHistory(principal.id,key,input,now().toISOString());
  }};
}
