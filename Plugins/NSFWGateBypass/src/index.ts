import { Plugin, registerPlugin } from 'enmity-api/plugins';
import { getModuleByProps } from 'enmity-api/module';
import { create } from 'enmity-api/patcher';

const Patcher = create('nsfw-gate-bypass');

const Guilds = getModuleByProps('isNSFWInvite');
const User = getModuleByProps('getCurrentUser').default;

const NSFWGateBypass: Plugin = {
   name: 'NSFWGateBypass',

   onStart() {
      Patcher.instead(Guilds, 'isNSFWInvite', () => false);
      Patcher.instead(Guilds, 'shouldNSFWGateGuild', () => false);
      Patcher.instead(Guilds, 'handleNSFWGuildInvite', () => false);

      Patcher.after(User, 'getCurrentUser', (self, args, user) => {
         if (user.nsfwAllowed == false) {
            user.nsfwAllowed = true;
         }

         return user;
      });
   },

   onStop() {
      Patcher.unpatchAll();
   }
};

registerPlugin(NSFWGateBypass);