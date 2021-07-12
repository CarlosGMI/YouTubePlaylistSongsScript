const { open, appendFile } = require('fs/promises');
const { google } = require('googleapis');

require('dotenv').config();

const playlistIds = process.env.PLAYLIST_IDS.split(',');
const playlistParams = {
	key: process.env.API_KEY,
	part: ['snippet'],
	maxResults: 50,
};

fetchPlaylists();

async function fetchPlaylists() {
	for (const playlistId of playlistIds) {
		const playlist = await fetchPlaylist(playlistId);
		const playlistName = playlist.data.items[0].snippet.title;
		let playlistNextPage = null;

		const file = await createFile(playlistName);

		while (true) {
			const playlistItems = await fetchPlaylistItems(playlistId, playlistNextPage);
			playlistNextPage = playlistItems.data.nextPageToken;

			await findNamesInResults(playlistItems.data.items, playlistName);

			if (!playlistNextPage) {
				await file.close();

				break;
			}
		}
	}

	console.log('=============== DONE ===============');
	process.exit();
}

function fetchPlaylist(playlistId) {
	const data = {
		...playlistParams,
		id: playlistId,
	};

	try {
		return google.youtube('v3').playlists.list(data);
	} catch (error) {
		console.error(error);
	}
}

async function fetchPlaylistItems(playlistId, nextPageToken = null) {
	const data = {
		...playlistParams,
		...(nextPageToken && { pageToken: nextPageToken }),
		playlistId,
	};

	try {
		return await google.youtube('v3').playlistItems.list(data);
	} catch (error) {
		console.error(error.message);
	}
}

async function findNamesInResults(playlistItems, playlistName) {
	for (const playlistItem of playlistItems) {
		const songName = playlistItem.snippet.title;

		try {
			await writeToFile(playlistName, songName);
		} catch (error) {
			console.error(error.message);
		}
	}
}

function createFile(playlistName) {
	return open(`${__dirname}/${playlistName}.txt`, 'w');
}

async function writeToFile(playlistName, content) {
	return appendFile(`${__dirname}/${playlistName}.txt`, `${content}\r\n`);
}
