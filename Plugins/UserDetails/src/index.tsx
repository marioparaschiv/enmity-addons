import { ColorMap, Moment, React, StyleSheet, Toasts } from 'enmity/metro/common';
import { FormDivider, FormRow, Text, View } from 'enmity/components';
import { Plugin, registerPlugin } from 'enmity/managers/plugins';
import { getIDByName } from 'enmity/api/assets';
import { bulk, filters } from 'enmity/metro';
import { create } from 'enmity/patcher';
import manifest from '../manifest.json';

const [
   Header,
   Members,
   Guilds
] = bulk(
   filters.byDisplayName('UserProfileHeader', false),
   filters.byProps('getMember'),
   filters.byProps('getGuild'),
);

const Patcher = create('user-details');

const SplitMessages: Plugin = {
   ...manifest,

   onStart() {
      Patcher.instead(Header, 'default', (self, args, orig) => {
         const [{ user, channel, type }] = args;

         if (type !== 0) {
            return orig.apply(self, args);
         }

         const styles = StyleSheet.createThemedStyleSheet({
            container: {
               marginLeft: 15.5,
               marginRight: 15.5,
               marginTop: 17.5
            },
            header: {
               color: ColorMap.ThemeColorMap.HEADER_SECONDARY,
               opacity: 0.975,
               fontFamily: ColorMap.Fonts.DISPLAY_BOLD,
               textTransform: 'uppercase',
               fontSize: 12.75,
               letterSpacing: 0.25
            },
            information: {
               borderRadius: 4,
               backgroundColor: ColorMap.ThemeColorMap.BACKGROUND_PRIMARY,
               marginTop: 10
            },
            item: {
               color: ColorMap.ThemeColorMap.TEXT_MUTED
            },
            icon: {
               color: ColorMap.ThemeColorMap.INTERACTIVE_NORMAL
            }
         });

         const Add = getIDByName('ic_header_members_add_24px');
         const Joined = getIDByName('ic_leave_24px');

         const isGuild = channel?.guild_id;
         const member = isGuild && Members.getMember(channel.guild_id, user.id);
         const guild = isGuild && Guilds.getGuild(channel.guild_id);

         return [orig.apply(self, args), <View style={styles.container}>
            <Text style={styles.header}>
               Information
            </Text>
            <View style={styles.information}>
               <FormRow
                  label='Created'
                  leading={<FormRow.Icon style={styles.icon} source={Add} />}
                  onPress={() => {
                     Toasts.open({
                        content: Moment(user.createdAt).format('D MMMM YYYY HH:mm'),
                        source: Add
                     });
                  }}
                  trailing={() => <Text style={styles.item}>
                     {Moment(user.createdAt).fromNow()}
                  </Text>}
               />
               {isGuild && member && <>
                  <FormDivider />
                  <FormRow
                     label={`Joined ${guild?.name ?? ''}`}
                     leading={<FormRow.Icon style={styles.icon} source={Joined} />}
                     onPress={() => {
                        Toasts.open({
                           content: Moment(member.joinedAt).format('D MMMM YYYY HH:mm'),
                           source: Joined
                        });
                     }}
                     trailing={() => <Text style={styles.item}>
                        {Moment(member.joinedAt).fromNow()}
                     </Text>}
                  />
               </>}
            </View>
         </View>];
      });
   },

   onStop() {
      Patcher.unpatchAll();
   },
};

registerPlugin(SplitMessages);