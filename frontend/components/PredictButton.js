import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { useAppTheme } from '../utils/theme';

const PredictButton = ({ title = 'Predict', onPress, className, textClassName, disabled }) => {
	const { isDark } = useAppTheme();
	return (
		<TouchableOpacity
			className={`w-full rounded-full py-3 items-center justify-center ${
				disabled
					? isDark
						? 'bg-aquaaccent/70 opacity-70'
						: 'bg-sky-300 opacity-70'
					: isDark
					? 'bg-aquaprimary'
					: 'bg-sky-500'
			} ${className || ''}`}
			onPress={onPress}
			activeOpacity={0.8}
			disabled={disabled}
		>
			<Text
				className={`text-[15px] font-semibold ${isDark ? 'text-slate-950' : 'text-white'} ${
					textClassName || ''
				}`}
			>
				{title}
			</Text>
		</TouchableOpacity>
	);
};

export default PredictButton;
