import { Constants, Messages, Users } from 'enmity/metro/common';
import { Plugin, registerPlugin } from 'enmity/managers/plugins';
import { getByProps } from 'enmity/metro';
import { create } from 'enmity/patcher';
import manifest from '../manifest.json';

const Channels = getByProps('hasChannel');

const Patcher = create('split-messages');

const SplitMessages: Plugin = {
   ...manifest,

   onStart() {
      Constants._MAX_MESSAGE_LENGTH = Constants.MAX_MESSAGE_LENGTH;
      Constants._MAX_MESSAGE_LENGTH_PREMIUM = Constants.MAX_MESSAGE_LENGTH_PREMIUM;
      Constants.MAX_MESSAGE_LENGTH_PREMIUM = 9999999999999;
      Constants.MAX_MESSAGE_LENGTH = 9999999999999;

      Patcher.instead(Messages, 'sendMessage', (self, args, orig) => {
         const [channelId, opts] = args;
         if (!opts?.content || !channelId) {
            return orig.apply(self, args);
         }

         const channel = Channels.getChannel(channelId);
         if (!channel) {
            return orig.apply(self, args);
         }

         const user = Users.getCurrentUser();
         const limit = user.premiumType === 2 ? Constants._MAX_MESSAGE_LENGTH_PREMIUM : Constants._MAX_MESSAGE_LENGTH;
         if (opts.content?.length <= limit) {
            return orig.apply(self, args);
         }

         const messages = opts.content.match(new RegExp(`.{0,${limit}}`, 'g'))?.filter(Boolean);
         if (!messages || messages.length === 1) {
            return orig.apply(self, args);
         }

         if (channel.rateLimitPerUser) {
            orig.apply(self, [channelId, { ...opts, content: messages.shift() }]);

            for (let i = 0, len = messages.length; i < len; i++) {
               setTimeout((msg) => {
                  const args = [channelId, { ...opts, content: msg }];
                  orig.apply(self, args);
               }, (channel.rateLimitPerUser * 1000) + 1000, messages[i]);
            }
         } else {
            for (let i = 0, len = messages.length; i < len; i++) {
               setTimeout((msg) => {
                  const args = [channelId, { ...opts, content: msg }];
                  orig.apply(self, args);
               }, 1000 * i * (messages > 4 ? 2 : 1), messages[i]);
            }
         }
      });
   },

   onStop() {
      if (Constants._MAX_MESSAGE_LENGTH) {
         Constants.MAX_MESSAGE_LENGTH = Constants._MAX_MESSAGE_LENGTH;
      }

      if (Constants._MAX_MESSAGE_LENGTH_PREMIUM) {
         Constants.MAX_MESSAGE_LENGTH_PREMIUM = Constants._MAX_MESSAGE_LENGTH_PREMIUM;
      }

      Patcher.unpatchAll();
   },
};

registerPlugin(SplitMessages);