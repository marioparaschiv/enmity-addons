import { FormRow, FormSwitch } from 'enmity/components';
import { SettingsStore } from 'enmity/api/settings';
import { React } from 'enmity/metro/common';

interface SettingsProps {
   settings: SettingsStore;
}

export default ({ settings }: SettingsProps) => {
   return <FormRow
      label='Long press to open profiles:'
      trailing={
         <FormSwitch
            value={settings.get('longPressEnabled', false)}
            onValueChange={() => settings.toggle('longPressEnabled', false)}
         />
      }
   />;
};