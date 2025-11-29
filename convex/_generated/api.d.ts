/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as analytics from "../analytics.js";
import type * as auth from "../auth.js";
import type * as crons from "../crons.js";
import type * as externalLinks from "../externalLinks.js";
import type * as notifications from "../notifications.js";
import type * as portfolio from "../portfolio.js";
import type * as ratings from "../ratings.js";
import type * as requests from "../requests.js";
import type * as serviceListings from "../serviceListings.js";
import type * as skills from "../skills.js";
import type * as transactions from "../transactions.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  analytics: typeof analytics;
  auth: typeof auth;
  crons: typeof crons;
  externalLinks: typeof externalLinks;
  notifications: typeof notifications;
  portfolio: typeof portfolio;
  ratings: typeof ratings;
  requests: typeof requests;
  serviceListings: typeof serviceListings;
  skills: typeof skills;
  transactions: typeof transactions;
  users: typeof users;
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
