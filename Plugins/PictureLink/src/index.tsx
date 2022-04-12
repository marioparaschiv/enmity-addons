import { getModule, getModuleByProps } from 'enmity-api/module';
import { Plugin, registerPlugin } from 'enmity-api/plugins';
import { React, Pressable } from 'enmity-api/react';
import { create } from 'enmity-api/patcher';

const Patcher = create('picture-link');

const ProfileBanner = getModule(m => m.default?.name === 'ProfileBanner');
const Header = getModule(m => m.default?.name === 'HeaderAvatar');
const Router = getModuleByProps('transitionToGuild');

const PictureLink: Plugin = {
   name: 'PictureLink',

   onStart() {
      Patcher.after(Header, 'default', (_, [{ user }], res) => {
         const image = user?.getAvatarURL?.(false, 4096, true)?.replace('.webp', '.png');

         if (!image) return res;

         return <Pressable onPress={() => Router.openURL(image)}>
            {res}
         </Pressable>;
      });

      Patcher.after(ProfileBanner, 'default', (_, [{ bannerSource }], res) => {
         if (!bannerSource?.uri) return res;
         const image = bannerSource.uri
            .replace(/(?:\?size=\d{3,4})?$/, '?size=4096')
            .replace('.webp', '.png');

         return <Pressable onPress={() => Router.openURL(image)}>
            {res}
         </Pressable>;
      });
   },

   onStop() {
      Patcher.unpatchAll();
   },
};

registerPlugin(PictureLink);