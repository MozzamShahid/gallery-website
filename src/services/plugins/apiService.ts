import { Endpoints } from "@/constants/Endpoints";
import { Placeholders } from "@/constants/Placeholders";
import { Plugin } from "@/interfaces/Plugin";
import { resetPluginsCache } from "../plugins/cacheService";
import { ApiPlugin } from "@/interfaces/ApiPlugin";
import { getNpmPluginData } from "./npmService";

/**
 * Wraps around the window fetch function to always include credentials.
 *
 * @param url url to call
 * @param options additional options passed to fetch
 */
const galleryApiFetch = (url: string, options = {}) => {
	return fetch(url, {
		...options,
		credentials: 'include',
	});
}

const fetchPluginsFromApi = async (	
	url: string,
): Promise<Plugin[]> => {

	try {
		let apiPlugins = null;

		if (url.startsWith("http")) {
			const response = await galleryApiFetch(url);
			const result = await response.json();
			apiPlugins = result.data;
		} else {
			apiPlugins = Placeholders.plugins;
		}

    // now fetch the details of each plugin
		if (apiPlugins) {
      // extra check needed because if a specific theme id is requested it is not an array
      apiPlugins = Array.isArray(apiPlugins) ? apiPlugins : [apiPlugins];
			return await fetchPluginsFromNpm(apiPlugins);
		} else {
			throw new Error('couldnt fetch plugins')
		}
	} catch (err: any) {
		throw new Error(err)
	}
}

/**
 * Fetches plugins information from npm.
 */
const fetchPluginsFromNpm = async (apiPlugins: ApiPlugin[]): Promise<Plugin[]> => {
	// todo: good to cache themes already fetched to reduce calls to cdn
	return await Promise.all(apiPlugins.map(apiPlugin => getNpmPluginData(apiPlugin)));
}

const addPluginToFavorites = async (plugin: Plugin) => {
  resetPluginsCache();
	try {
		// Construct the URL
		const url = Endpoints.favoritePlugins;

		// Make a POST request with the pluginId
		const response = await galleryApiFetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ pluginId: plugin.id }),
		});

		// Check if the response is successful
		if (!response.ok) {
			const errorDetails = await response.json();
			throw new Error(`Failed to add plugin to favorites: ${errorDetails.message}`);
		}

		// Return the response data if needed
		return await response.json();
	} catch (err) {
		console.error("Error adding plugin to favorites:", err);
		throw new Error("Could not add plugin to favorites");
	}
};

const removePluginFromFavorites = async (plugin: Plugin) => {
  resetPluginsCache();
  try {
    // Construct the URL with the pluginId as a query parameter
    const pluginId = encodeURIComponent(plugin.id);
    const url = `${Endpoints.favoritePlugins}?pluginId=${pluginId}`;

    // Make a DELETE request
    const response = await galleryApiFetch(url, {
      method: "DELETE",
    });

    // Check if the response is successful
    if (!response.ok) {
      const errorDetails = await response.json();
      throw new Error(`Failed to remove plugin from favorites: ${errorDetails.message}`);
    }

    // Optionally return response data if needed
    return await response.json();
  } catch (err) {
    console.error("Error removing plugin from favorites:", err);
    throw new Error("Could not remove plugin from favorites");
  }
};

export {
	galleryApiFetch,
  fetchPluginsFromApi,
  addPluginToFavorites,
  removePluginFromFavorites
}