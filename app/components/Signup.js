import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, TouchableOpacity } from 'react-native';
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
        <View style={styles.container}>
            <Text style={styles.title}>회원가입</Text>
            <TextInput
                style={styles.textInput}
                placeholder="이름"
                onChangeText={text => setName(text)}
                value={Name}
            />
            <TextInput
                style={styles.textInput}
                placeholder="이메일"
                onChangeText={text => setEmail(text)}
                value={Email}
            />
            <TextInput
                style={styles.textInput}
                placeholder="아이디"
                onChangeText={text => setaccountID(text)}
                value={accountID}
            />
            <TextInput
                style={styles.textInput}
                placeholder="비밀번호"
                secureTextEntry={true}
                onChangeText={text => setPassword(text)}
                value={password}
            />
            <TouchableOpacity style={styles.signupbutton} onPress={Signup}>
                <Text style={styles.signupbuttonText}>회원가입</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        backgroundColor: 'white',
    },
    title: {
        fontSize: 24,  // 텍스트 크기 조절
        margin: 20,    // 마진 추가
    },
    textInput: {
        width: '80%',  // 입력 필드의 너비를 조절합니다.
        borderWidth: 1,  // 테두리 두께를 설정합니다.
        borderColor: '#000000',  // 테두리 색상을 설정합니다.
        padding: 10,  // 텍스트와 테두리 사이에 패딩을 추가합니다.
        borderRadius: 5,  // 선택적: 테두리의 모서리를 둥글게 만듭니다.
        margin: 20,
    },
    signupbutton: {
        width: '80%',  // 버튼의 너비를 조절합니다.
        padding: 10,  // 버튼 내부의 패딩을 설정합니다.
        backgroundColor: '#00BFFF',  // 버튼의 배경색을 설정합니다.
        borderColor: '#000000',
        borderRadius: 5,  // 버튼의 모서리를 둥글게 만듭니다.
        borderWidth: 1,
        alignItems: 'center',  // 텍스트를 버튼의 중앙에 정렬합니다.
        margin: 10,
    },
    signupbuttonText: {
        color: '#000000',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
