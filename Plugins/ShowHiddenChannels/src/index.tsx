import { registerPlugin } from 'enmity-api/plugins';
import { bulk, filters } from 'enmity-api/modules';
import { create } from 'enmity-api/patcher';
import { React } from 'enmity-api/react';

import findInReactTree from './utils/findInReactTree';
import Lock from './components/Lock';

const Patcher = create('show-hidden-channels');

const [
   ChannelItem,
   Permissions,
   ChannelRecord,
   Notifications,
   Constants,
   Channel,
   Fetcher,
   Navigator,
   Transitioner
] = bulk(
   m => m.default.name === 'BaseChannelItem',
   filters.byProps('getChannelPermissions'),
   filters.byProps('getChannel'),
   filters.byProps('hasUnread'),
   filters.byProps('Permissions'),
   filters.byName('ChannelRecord'),
   filters.byProps('fetchMessages'),
   filters.byProps('selectChannel'),
   filters.byProps('hasNavigated')
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

      Patcher.after(ChannelItem, 'default', (_, [info], res) => {
         const { channel }: any = findInReactTree(info, r => r?.channel) ?? {};
         if (!channel?.isHidden()) return res;

         res.props.children.push(<Lock />);
      });

      Patcher.instead(Fetcher, 'fetchMessages', (self, args, original) => {
         const { channelId } = args[0];
         const channel = ChannelRecord.getChannel(channelId);
         if (channel?.isHidden?.()) return;

         return original.apply(self, args);
      });

      Patcher.instead(Navigator, 'selectChannel', (self, args, original) => {
         const channel = ChannelRecord.getChannel(args[1]);
         if (channel?.isHidden?.()) return;

         return original.apply(self, args);
      });

      Patcher.instead(Transitioner, 'transitionToGuild', (self, args, original) => {
         const channel = ChannelRecord.getChannel(args[1]);
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