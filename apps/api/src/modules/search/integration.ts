import {SearchError} from '../../shared/search-context';
import {createSearchController,type SearchControllerDependencies} from './presentation/search.controller';

// The application bootstrap supplies FR12 identity/guard and the existing model/data/repository.
// Importing this module neither connects a database nor invents a public/account profile.
let integration: SearchControllerDependencies | undefined;
export function configureSearchIntegration(value: SearchControllerDependencies) {
 integration = value;
}
function required(): SearchControllerDependencies {
 if (!integration) throw new SearchError(503, 'SEARCH_INTEGRATION_REQUIRED', 'FR19 chưa được ghép với tài khoản và nguồn tài liệu.');
 return integration;
}
export const searchController = createSearchController({
 principal: request => required().principal(request),
 authorizeMutation: (request, principal) => required().authorizeMutation(request, principal),
 runtime: () => required().runtime(),
});
