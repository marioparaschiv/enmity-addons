import { Plugin, registerPlugin } from 'enmity/managers/plugins';
import { getByProps } from 'enmity/metro';
import { create } from 'enmity/patcher';
import manifest from './manifest.json';

const Patcher = create('spotify');
const Platforms = getByProps('isIOS');

const Spotify: Plugin = {
   onStart() {
      // Thankfully, this is barely used, so it breaks nothing that i know of.
      Patcher.instead(Platforms, 'isIOS', () => false);
   },

   onStop() {
      Patcher.unpatchAll();
   },

   ...manifest
};

registerPlugin(Spotify);