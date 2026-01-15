
import fs from 'fs';
import path from 'path';

async function main() {
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const REPO = process.env.GITHUB_REPOSITORY; // "owner/repo"
    const TAG = process.env.GITHUB_REF_NAME; // "v1.0.0"

    if (!GITHUB_TOKEN || !REPO || !TAG) {
        console.error('Missing required environment variables: GITHUB_TOKEN, GITHUB_REPOSITORY, GITHUB_REF_NAME');
        process.exit(1);
    }

    console.log(`Generating latest.json for ${REPO} @ ${TAG}`);

    // 1. Fetch Release Data
    const releaseUrl = `https://api.github.com/repos/${REPO}/releases/tags/${TAG}`;
    const response = await fetch(releaseUrl, {
        headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'User-Agent': 'Tauri-Updater-Generator'
        }
    });

    if (!response.ok) {
        console.error(`Failed to fetch release: ${response.status} ${response.statusText}`);
        const text = await response.text();
        console.error(text);
        process.exit(1);
    }

    const release = await response.json();
    const assets = release.assets;

    // 2. Map Assets to Platforms
    // This mapping depends on how Tauri bundles are named.
    // Standard matching logic:

    const platforms = {};
    const signatureMap = new Map(); // filename -> signature_content
    const assetMap = new Map(); // filename -> download_url

    // First pass: Find all signatures and download them
    console.log(`Found ${assets.length} assets in release:`);
    assets.forEach(a => console.log(` - ${a.name}`));

    for (const asset of assets) {
        if (asset.name.endsWith('.sig')) {
            console.log(`Found signature: ${asset.name}`);
            const sigResponse = await fetch(asset.browser_download_url);
            if (sigResponse.ok) {
                const sigContent = await sigResponse.text();
                signatureMap.set(asset.name, sigContent);
            } else {
                console.warn(`Failed to download signature ${asset.name}`);
            }
        } else {
            assetMap.set(asset.name, asset.browser_download_url);
        }
    }

    // Second pass: Match binaries to signatures
    for (const [sigName, sigContent] of signatureMap) {
        // The binary name is usually the sig name without ".sig"
        const binName = sigName.slice(0, -4);

        if (assetMap.has(binName)) {
            const downloadUrl = assetMap.get(binName);

            // Guess platform from filename
            let platform = null;
            if (binName.endsWith('.app.tar.gz')) {
                platform = 'darwin-x86_64'; // Legacy standard, but check arch
                if (binName.includes('aarch64')) platform = 'darwin-aarch64';
            } else if (binName.endsWith('.dmg')) {
                platform = 'darwin-x86_64';
                if (binName.includes('aarch64')) platform = 'darwin-aarch64';
            } else if (binName.endsWith('.msi') || binName.endsWith('.exe')) {
                platform = 'windows-x86_64';
                if (binName.includes('aarch64')) platform = 'windows-aarch64'; // Rare for now
            } else if (binName.endsWith('.AppImage') || binName.endsWith('.deb') || binName.endsWith('.rpm')) {
                platform = 'linux-x86_64';
                if (binName.includes('aarch64')) platform = 'linux-aarch64';
            }

            if (platform) {
                console.log(`Mapped ${binName} to ${platform}`);
                platforms[platform] = {
                    signature: sigContent.trim(),
                    url: downloadUrl
                };
            } else {
                console.warn(`Could not determine platform for ${binName}`);
            }
        } else {
            console.warn(`Found signature ${sigName} but no matching binary ${binName}`);
        }
    }

    if (Object.keys(platforms).length === 0) {
        console.error("No valid platform assets found.");
        process.exit(1);
    }

    // 3. Construct latest.json
    const updaterJson = {
        version: TAG, // removes 'v' prefix if needed? Tauri usually handles 'v1.0.0' fine, but strictly it expects semver.
        // If tag is 'v1.0.0', version should be '1.0.0'.
        notes: release.body,
        pub_date: release.published_at,
        platforms: platforms
    };

    // Clean version if it starts with 'v'
    if (updaterJson.version.startsWith('v')) {
        updaterJson.version = updaterJson.version.substring(1);
    }

    const jsonString = JSON.stringify(updaterJson, null, 2);
    console.log("Generated latest.json:", jsonString);

    // 4. Upload latest.json to Release
    const uploadUrl = `https://uploads.github.com/repos/${REPO}/releases/${release.id}/assets?name=latest.json`;

    console.log("Uploading latest.json...");
    const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Content-Type': 'application/json',
            'User-Agent': 'Tauri-Updater-Generator'
        },
        body: jsonString
    });

    if (!uploadResponse.ok) {
        // Check if it already exists (422)
        if (uploadResponse.status === 422) {
            console.warn("latest.json already exists. You may need to delete it manually if you are re-running this.");
            // Ideally we would delete and re-upload, but simpler to warn for now or let user handle re-runs.
        } else {
            console.error(`Failed to upload latest.json: ${uploadResponse.status}`);
            const text = await uploadResponse.text();
            console.error(text);
            process.exit(1);
        }
    } else {
        console.log("Successfully uploaded latest.json!");
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
