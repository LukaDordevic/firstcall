/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as gtm from "../gtm.js";
import type * as gtmActions from "../gtmActions.js";
import type * as leads from "../leads.js";
import type * as leadsActions from "../leadsActions.js";
import type * as lib_parse from "../lib/parse.js";
import type * as lib_providers from "../lib/providers.js";
import type * as roleplay from "../roleplay.js";
import type * as roleplayActions from "../roleplayActions.js";
import type * as validators from "../validators.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  gtm: typeof gtm;
  gtmActions: typeof gtmActions;
  leads: typeof leads;
  leadsActions: typeof leadsActions;
  "lib/parse": typeof lib_parse;
  "lib/providers": typeof lib_providers;
  roleplay: typeof roleplay;
  roleplayActions: typeof roleplayActions;
  validators: typeof validators;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
