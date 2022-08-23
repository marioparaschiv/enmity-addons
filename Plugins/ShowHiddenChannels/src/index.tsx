import { StyleSheet, Constants, React } from 'enmity/metro/common';
import { findInReactTree, wrapInHooks } from 'enmity/utilities';
import { registerPlugin } from 'enmity/managers/plugins';
import { Image, Text, View } from 'enmity/components';
import { getIDByName } from 'enmity/api/assets';
import { bulk, filters } from 'enmity/metro';
import { create } from 'enmity/patcher';

import Lock from './components/Lock';

const Patcher = create('show-hidden-channels');

const [
   ChannelItem,
   Permissions,
   ChannelRecord,
   Notifications,
   Channel,
   Fetcher,
   Messages,
   Members
] = bulk(
   filters.byName('BaseChannelItem', false),
   filters.byProps('getChannelPermissions'),
   filters.byProps('getChannel'),
   filters.byProps('hasUnread'),
   filters.byName('ChannelRecord'),
   filters.byProps('fetchMessages'),
   filters.byName('MessagesConnected', false),
   filters.byName('MainMembers', false)
);

const ShowHiddenChannels = {
   name: 'ShowHiddenChannels',
   version: '1.0.0',
   description: "Displays all hidden channels which can't be accessed, this won't allow you to read them.",
   authors: [
      {
         name: 'eternal',
         id: '263689920210534400'
      }
   ],

   onStart() {
      this.can = Permissions.can.__original ?? Permissions.can;

      const _this = this;
      Channel.prototype.isHidden = function () {
         return ![1, 3].includes(this.type) && !_this.can(Constants.Permissions.VIEW_CHANNEL, this);
      };

      Patcher.after(Permissions, 'can', (_, [permission]) => {
         if (permission === Constants.Permissions.VIEW_CHANNEL) {
            return true;
         }
      });

      Patcher.after(Notifications, 'hasUnread', (_, args, res) => {
         return res && !ChannelRecord.getChannel(args[0])?.isHidden();
      });

      Patcher.after(Notifications, 'hasUnreadPins', (_, args, res) => {
         if (!ChannelRecord.getChannel(args[0])) return false;
      });

      Patcher.after(Notifications, 'getMentionCount', (_, args, res) => {
         return ChannelRecord.getChannel(args[0])?.isHidden() ? 0 : res;
      });

      const unpatch = Patcher.after(View, 'render', (_, __, res) => {
         const channel: any = findInReactTree(res, r => r.props?.channel && r.props?.isRulesChannel !== void 0);
         if (!channel) return;

         Patcher.after(channel.type, 'type', (_, [{ channel }], res) => {
            if (!channel?.isHidden()) return res;

            const payload = findInReactTree(res, r => r !== res && Array.isArray(r.props?.children));
            if (payload) payload.props.children.push(<Lock />);

            return res;
         });

         unpatch();
      });

      const LockIcon = getIDByName('nsfw_gate_lock');
      Patcher.after(Members, 'default', (_, __, res) => {
         if (!res) return res;
         res = wrapInHooks(res.type.type)(res.props);

         res.props.children = (orig => {
            const { channel } = orig.props ?? {};
            const payload = wrapInHooks(orig.type)(orig.props);

            if (channel?.isHidden()) {
               payload.props.children.pop();
               payload.props.children.push(
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                     <Image style={{ width: 75, height: 75 }} source={LockIcon} />
                  </View>
               );
            }

            return payload;
         })(res.props.children);

         return res;
      });

      Patcher.after(Messages, 'default', (_, __, res) => {
         const channel = res.props.channel;
         if (!channel?.isHidden()) return res;

         const styles = StyleSheet.createThemedStyleSheet({
            image: {
               width: 100,
               height: 100,
               padding: 5,
               marginBottom: 15
            },
            container: {
               flex: 1,
               alignItems: 'center',
               justifyContent: 'center',
               backgroundColor: Constants.ThemeColorMap.BACKGROUND_SECONDARY,
            },
            header: {
               color: Constants.ThemeColorMap.HEADER_PRIMARY,
               fontFamily: Constants.Fonts.PRIMARY_SEMIBOLD,
               fontWeight: 'bold',
               fontSize: 24
            },
            description: {
               color: Constants.ThemeColorMap.HEADER_SECONDARY,
               fontSize: 16,
               fontFamily: Constants.Fonts.PRIMARY_SEMIBOLD,
               marginLeft: 2.5,
               marginRight: 2.5,
               paddingLeft: 25,
               paddingRight: 25,
               paddingTop: 5,
               textAlign: 'center'
            }
         });

         return <View style={styles.container}>
            <Image style={styles.image} source={LockIcon} />
            <Text style={styles.header}>
               This is a hidden channel.
            </Text>
            <Text style={styles.description}>
               You cannot see the contents of this channel. However, you may see info by swiping to the right.
            </Text>
         </View>;
      });

      Patcher.after(ChannelItem, 'default', (_, [info], res) => {
         const { channel }: any = findInReactTree(info, r => r?.channel) ?? {};
         if (!channel?.isHidden()) return res;

         const payload = findInReactTree(res, r => r !== res && Array.isArray(r.props?.children));
         if (payload) payload.props.children.splice(4, 0, <Lock />);

         return res;
      });

      Patcher.instead(Fetcher, 'fetchMessages', (self, args, original) => {
         const { channelId } = args[0];
         const channel = ChannelRecord.getChannel(channelId);
         if (channel?.isHidden?.()) return;

         return original.apply(self, args);
      });
   },

   onStop() {
      delete Channel.prototype.isHidden;
      Patcher.unpatchAll();
   }
};

registerPlugin(ShowHiddenChannels);