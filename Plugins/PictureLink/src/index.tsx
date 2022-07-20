import { Plugin, registerPlugin } from 'enmity/managers/plugins';
import { Pressable } from 'enmity/components';
import { bulk, filters } from 'enmity/metro';
import { Dialog, React } from 'enmity/metro/common';
import { create } from 'enmity/patcher';
import { get } from 'enmity/api/settings';
import Settings from './settings';



const Patcher = create('picture-link');

const [
   ProfileBanner,
   Header,
   Router,
   Users
] = bulk(
   m => m.default?.name === 'ProfileBanner',
   m => m.default?.name === 'HeaderAvatar',
   filters.byProps('transitionToGuild'),
   filters.byProps('getUser')
);

const PictureLink: Plugin = {
   name: 'PictureLink',
   version: '2.0.0',
   description: "Allows you to tap / hold on avatars and banners to open them in-app.",
   authors: [
      {
         name: 'eternal',
         id: '263689920210534400'
      }
   ],

   onStart() {
      Patcher.after(Header, 'default', (_, [{ user, guildId, disableStatus }], res) => {
         let image;
         if(user?.avatar) { image = user?.getAvatarURL?.(false, 4096, true)?.replace('.webp', '.png'); }
         // Router will not open this url without a double slash after users. I have no clue why.
         const serverImage = `https://cdn.discordapp.com/guilds/${guildId}/users//${user?.id}/avatars/${user?.guildMemberAvatars[guildId]}.png?size=4096`

         if (disableStatus) {
            return res;
         }

         if (!image && user?.guildMemberAvatars[guildId] == null) { return res; }

         if (user?.guildMemberAvatars[guildId] == null && image) {
            return pressableObj(function () { return Router.openURL(image); }, res)
         }

         if (user?.guildMemberAvatars[guildId] != null && !image) {
            return pressableObj(function () { return Router.openURL(serverImage); }, res)
         }

         return pressableObj(function () { return showOpenDialog(serverImage, image); }, res)

      });

      Patcher.after(ProfileBanner, 'default', (wawa, [bannerObj], res) => {
         // Only ProfileBanners not in user settings have an undefined 'style' variable

         if (!("style" in bannerObj)) {
            return res;
         }

         const image = bannerObj.bannerSource.uri
            .replace(/(?:\?size=\d{3,4})?$/, '?size=4096')
            .replace('users', 'users/')
            .replace('.webp', '.png');

         if (!bannerObj.bannerSource?.uri) return res;

         const user = Users.getUser(bannerObj.bannerSource?.uri.replace('https://', '').split('/')[4])
         if (image.includes("users") && user.banner) {
            const globalImage = `https://cdn.discordapp.com/banners/${user.id}/${user.banner}.png?size=4096`

            return pressableObj(function () { return showOpenDialog(image, globalImage); }, res)
         }

         return pressableObj(function () { return Router.openURL(image); }, res)

      });
   },

   onStop() {
      Patcher.unpatchAll();
   },

   getSettingsPanel({ settings }) {
      return <Settings settings={settings} />;
   }
};

function pressableObj(func, res) {
   // Whether or not we should have long pressable buttons or just tappable
   if (get('PictureLink', 'longPressEnabled', false)) {
      return <Pressable onLongPress={() => func()}>
         {res}
      </Pressable>;
   } else {
      return <Pressable onPress={() => func()}>
         {res}
      </Pressable>;
   }
}

function showOpenDialog(serverURL, globalURL) {
   Dialog.show(
      {
         title: "Open...",
         body: "Select a profile to open.",
         confirmText: "Server Profile",
         cancelText: "Global Profile",
         secondaryConfirmText: "Nevermind",
         onConfirm: () => { Router.openURL(serverURL) },
         onCancel: () => { Router.openURL(globalURL) }
      }
   )
}

registerPlugin(PictureLink);


