//@ts-check

// NOTES: @ts-expect-error is used in places where literal type can be estimated
// by human but not by TypeScript, or where type definitions are invalid in
// comparison to the reality. When moving config to TS, the one should use
// `as {expected-type}` keyword instead.

import { MakerSquirrel } from '@electron-forge/maker-squirrel'
import { MakerZIP } from '@electron-forge/maker-zip'
import { MakerDeb } from '@electron-forge/maker-deb'
import { MakerRpm } from '@electron-forge/maker-rpm'
import { MakerDMG } from '@electron-forge/maker-dmg'
import { MakerAppImage } from '@reforged/maker-appimage'
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives'
import { PublisherGithub } from '@electron-forge/publisher-github'
import { PublisherSnapcraft } from '@electron-forge/publisher-snapcraft'
import packageJSON from './package.json' with { type: 'json'}

/**
 * @template {string} S
 * @param {S} string
 * @returns {Lowercase<S>}
 */
const toLowerTS = (string) => String.prototype.toLowerCase.call(string);

/**
 * @type {{options: Required<import('@electron-forge/maker-deb').MakerDebConfig>["options"]&Required<import('@electron-forge/maker-rpm').MakerRpmConfig>["options"]}}
 */
const linuxMeta = {
	options: {
		icon: 'build/icon.png',
		productDescription: packageJSON.description,
		categories: [
			"Network",
			//@ts-expect-error
			"Chat"
		]
	}
}

const repoMeta = Object.freeze({
	owner: packageJSON.repository.split('/')[0],
	name: packageJSON.repository.split('/')[1],
	/**@type {'com'} */
	domain: 'com'
})

const release = /^(?:release|stable|final|dist(?:ribution)?)$/i.test(process.env['CAPRINE_RELEASE']??'') ?
	'Distribution' :
	'Development'

/** @type import('@electron-forge/shared-types').ForgeConfig */
const config = {
	buildIdentifier: release === 'Development' ? release.slice(0,5) : release.slice(0,4),
	packagerConfig: {
		asar: {
			unpack: 'static/Icon.png'
		},
		ignore: [
			/(media|patches|packages)\/(.*)?$/,
			
		],
		appBundleId: `${repoMeta.domain}.${repoMeta.owner.toLowerCase()}.${repoMeta.name.toLowerCase()}`,
		// Workaround: Enforce embedding a PNG file in Windows
		icon: 'build/icon' + process.platform === 'darwin' ? '' : '.png',
		usageDescription: {
			Camera: 'Caprine needs access to your camera.',
			Microphone: 'Caprine needs access to your microphone.'
		},
		extendInfo: {
			LSUIElement: 1
		},
		osxSign: {
			identity: process.env["CAPRINE_SIGN_IDENTITY"],
			keychain: process.env["CAPRINE_SIGN_KEYCHAIN"],
			strictVerify: true,
			identityValidation: true,
			type: toLowerTS(release),
			optionsForFile: () => ({
				entitlements:'build/entitlements.mac.plist',
				hardenedRuntime: true
			})
		},
		darwinDarkModeSupport: true,
		appCategoryType: 'public.app-category.social-networking',
		executableName: process.platform !== 'win32' ? packageJSON.name : packageJSON.productName
	},
	rebuildConfig: {},
	makers: [
		new MakerDMG({
			icon: 'build/icon.icns',
			iconSize: 160,
			contents: [
				{ x: 180, y: 170, type: 'position', path: '' },
				{ x: 480, y: 170, type: 'link', path: '/Applications' }
			]
		}),
		new MakerSquirrel({}),
		new MakerZIP({}, ['darwin']),
		new MakerDeb(linuxMeta),
		new MakerRpm(linuxMeta),
		new MakerAppImage(linuxMeta)
	],
	plugins: [
		new AutoUnpackNativesPlugin({})
	],
  publishers: [
    new PublisherGithub({ repository: repoMeta }),
		new PublisherSnapcraft({ release: 'stable' })
  ]
};

export default config;
