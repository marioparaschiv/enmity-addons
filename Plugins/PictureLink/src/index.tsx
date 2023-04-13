import { Plugin, registerPlugin } from 'enmity/managers/plugins';
import { Pressable } from 'enmity/components';
import { bulk, filters } from 'enmity/metro';
import { React } from 'enmity/metro/common';
import { create } from 'enmity/patcher';

const Patcher = create('picture-link');

const [
  ProfileBanner,
  Header,
  Router
] = bulk(
  filters.byName('ProfileBanner', false),
  filters.byName('HeaderAvatar', false),
  filters.byProps('transitionToGuild', 'openURL')
);

const PictureLink: Plugin = {
  name: 'PictureLink',
  version: '1.0.2',
  description: "Allows you to click avatars and banners to open them in-app.",
  authors: [
    {
      name: 'eternal',
      id: '263689920210534400'
    }
  ],

  onStart() {
    Patcher.after(Header, 'default', (_, [{ user, style }], res) => {
      const image = user?.getAvatarURL?.(false, 4096, true);
      if (!image) return res;

      const discrim = user.discriminator % 5;
      const url = typeof image === 'number' ? `https://cdn.discordapp.com/embed/avatars/${discrim}.png` : image?.replace('.webp', '.png');

      delete res.props.style;

      return <Pressable
        onPress={() => Router.openURL(url)}
        style={style}
      >
        {res}
      </Pressable>;
    });

    Patcher.after(ProfileBanner, 'default', (_, [{ bannerSource }], res) => {
      if (typeof bannerSource?.uri !== 'string' || !res) return res;

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