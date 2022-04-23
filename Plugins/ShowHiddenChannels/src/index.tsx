import { bulk, filters } from 'enmity-api/modules';
import { Plugin, registerPlugin } from 'enmity-api/plugins';
import { React, View, Text } from 'enmity-api/react';
import { create } from 'enmity-api/patcher';
import Lock from './components/Lock';

const Patcher = create('show-hidden-channels');

const [
   ChannelItem,
   Permissions,
   ChannelRecord,
   Notifications,
   Constants,
   Channel,
   Channels
] = bulk(
   filters.byName('BaseChannelItem'),
   filters.byProps('getChannelPermissions'),
   filters.byProps('getChannel'),
   filters.byProps('hasUnread'),
   filters.byProps('Permissions'),
   filters.byName('ChannelRecord'),
   m => m.default?.name === 'ConnectedGuildSidebar'
);

const ShowHiddenChannels = {
   name: 'ShowHiddenChannels',
   commands: [],

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

         res.props.children.push(<Lock style={{ verticalAlign: 'center', justifyContent: 'center', alignItems: 'center' }} />);
      });
   },

   onStop() {
      delete Channel.prototype.isHidden;
      Patcher.unpatchAll();
   }
};

function findInReactTree(tree = {}, filter = _ => _, { ignore = [], walkable = ['props', 'children'], maxProperties = 100 } = {}) {
   const stack = [tree];
   const wrapFilter = function (...args) {
      try {
         return Reflect.apply(filter, this, args);
      } catch {
         return false;
      }
   };

   while (stack.length && maxProperties) {
      const node = stack.shift();
      if (wrapFilter(node)) return node;

      if (Array.isArray(node)) {
         stack.push(...node);
      } else if (typeof node === 'object' && node !== null) {
         if (walkable.length) {
            for (const key in node) {
               const value = node[key];
               if (~walkable.indexOf(key) && !~ignore.indexOf(key)) {
                  stack.push(value);
               }
            }
         } else {
            for (const key in node) {
               const value = node[key];
               if (node && ~ignore.indexOf(key)) continue;

               stack.push(value);
            }
         }
      }
      maxProperties--;
   }
};

registerPlugin(ShowHiddenChannels);