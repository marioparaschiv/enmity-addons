import { Plugin, registerPlugin } from 'enmity/managers/plugins';
import { bulk, filters } from 'enmity/metro';
import { create } from 'enmity/patcher';

const Patcher = create('nsfw-gate-bypass');

const [
   Guilds,
   User
] = bulk(
   filters.byProps('isNSFWInvite'),
   filters.byProps('getCurrentUser')
);

const NSFWGateBypass: Plugin = {
   name: 'NSFWGateBypass',
   version: '1.0.0',
   description: 'Bypasses NSFW guild, channel and invite gates.',
   authors: [
      {
         name: 'eternal',
         id: '263689920210534400'
      }
   ],

   onStart() {
      Patcher.instead(Guilds, 'isNSFWInvite', () => false);
      Patcher.instead(Guilds, 'shouldNSFWGateGuild', () => false);
      Patcher.instead(Guilds, 'handleNSFWGuildInvite', () => false);

      Patcher.after(User, 'getCurrentUser', (_, __, user) => {
         if (user?.hasOwnProperty('nsfwAllowed')) {
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