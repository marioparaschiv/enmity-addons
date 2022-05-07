import { Plugin, registerPlugin } from 'enmity-api/plugins';
import { React, Pressable } from 'enmity-api/react';
import { bulk, filters } from 'enmity-api/modules';
import { create } from 'enmity-api/patcher';

const Patcher = create('picture-link');

const [
   ProfileBanner,
   Header,
   Router
] = bulk(
   m => m.default?.name === 'ProfileBanner',
   m => m.default?.name === 'HeaderAvatar',
   filters.byProps('transitionToGuild')
);

const PictureLink: Plugin = {
   name: 'PictureLink',
   version: '1.0.0',
   description: "Allows you to click avatars and banners to open them in-app.",
   authors: [
      {
         name: 'eternal',
         id: '263689920210534400'
      }
   ],

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