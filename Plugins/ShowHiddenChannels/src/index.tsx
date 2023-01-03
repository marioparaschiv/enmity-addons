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
  Members,
  Payloads
] = bulk(
  filters.byName('BaseChannelItem', false),
  filters.byProps('getChannelPermissions'),
  filters.byProps('getChannel'),
  filters.byProps('hasUnread'),
  filters.byProps('ChannelRecordBase'),
  filters.byProps('stores', 'fetchMessages'),
  filters.byName('MessagesConnected', false),
  filters.byName('MainMembers', false),
  filters.byProps('getOrCreate')
);

const ShowHiddenChannels = {
  name: 'ShowHiddenChannels',
  version: '2.0.2',
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
    Channel.ChannelRecordBase.prototype.isHidden = function () {
      return ![1, 3].includes(this.type) && !_this.can(Constants.Permissions.VIEW_CHANNEL, this);
    };

    Patcher.after(Permissions, 'can', (_, [permission]) => {
      if (permission === Constants.Permissions.VIEW_CHANNEL) {
        return true;
      }
    });

    Patcher.after(Notifications, 'hasUnread', (_, [id], res) => {
      return res && !ChannelRecord.getChannel(id)?.isHidden();
    });

    Patcher.after(Notifications, 'hasRelevantUnread', (_, [channel], res) => {
      return res && !channel.isHidden();
    });

    Patcher.after(Notifications, 'hasNotableUnread', (_, [id], res) => {
      return res && !ChannelRecord.getChannel(id)?.isHidden();
    });

    Patcher.after(Notifications, 'hasUnreadPins', (_, [id]) => {
      if (!ChannelRecord.getChannel(id)) {
        return false;
      }
    });

    Patcher.after(Notifications, 'getMentionCount', (_, [id], res) => {
      return ChannelRecord.getChannel(id)?.isHidden() ? 0 : res;
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
          backgroundColor: Constants.ThemeColorMap.BACKGROUND_PRIMARY,
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
        },
        lastMessage: {
          marginTop: 5
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
        <Text style={{ ...styles.description, ...styles.lastMessage }}>
          Last Message sent on {this.parseSnowflake(channel.lastMessageId)}.
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
      if (channel?.isHidden?.()) {
        const messages = Payloads.getOrCreate(channelId);
        messages.loadingMore = false;

        return;
      }

      return original.apply(self, args);
    });
  },

  onStop() {
    delete Channel.prototype.isHidden;
    Patcher.unpatchAll();
  },

  parseSnowflake(snowflake: string) {
    try {
      const id = parseInt(snowflake);
      const binary = id.toString(2).padStart(64, '0');
      const excerpt = binary.substring(0, 42);
      const decimal = parseInt(excerpt, 2);
      const unix = decimal + 1420070400000;
      return new Date(unix).toLocaleString();
    } catch (e) {
      console.error(e);
      return '(Failed to get date)';
    }
  }
};

registerPlugin(ShowHiddenChannels);