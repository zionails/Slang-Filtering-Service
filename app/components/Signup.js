import React, { useState } from 'react';
import { View, Text, TextInput, Button } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Signup({ onClose }) {
    const [Name, setName] = useState('');
    const [Email, setEmail] = useState('');
    const [accountID, setaccountID] = useState('');
    const [password, setPassword] = useState('');

    const Signup = async () => {
        try {

            onClose();
        } catch (error) {
            // 에러 처리를 수행하세요.
            console.error('데이터 저장 중 오류 발생:', error);
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: 'lightgray' }}>
            <Text>회원가입</Text>
            <TextInput
                placeholder="이름"
                onChangeText={text => setName(text)}
                value={Name}
            />
            <TextInput
                placeholder="이메일"
                onChangeText={text => setEmail(text)}
                value={Email}
            />
            <TextInput
                placeholder="아이디"
                onChangeText={text => setaccountID(text)}
                value={accountID}
            />
            <TextInput
                placeholder="비밀번호"
                secureTextEntry={true}
                onChangeText={text => setPassword(text)}
                value={password}
            />

            <Button title="회원가입" onPress={Signup} />
        </View>
    );
};


