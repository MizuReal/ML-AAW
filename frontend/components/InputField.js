import React from 'react';
import { View, Text, TextInput } from 'react-native';
import { useAppTheme } from '../utils/theme';

const InputField = ({ label, className, ...textInputProps }) => {
	const { isDark } = useAppTheme();
	return (
		<View className="w-full">
			{label ? (
				<Text className={`mb-1.5 text-[13px] font-medium ${isDark ? 'text-sky-100' : 'text-slate-700'}`}>
					{label}
				</Text>
			) : null}
			<TextInput
				className={`w-full rounded-xl border px-3.5 py-2.5 text-[14px] ${
					isDark
						? 'border-blue-600/70 bg-aquadark text-slate-100'
						: 'border-slate-300 bg-white text-slate-800'
				} ${className || ''}`}
				placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
				{...textInputProps}
			/>
		</View>
	);
};

export default InputField;
