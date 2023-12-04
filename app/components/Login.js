import React, { useState } from 'react';
import { View, Text, TextInput, Button, Modal, StyleSheet, TouchableOpacity } from 'react-native';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import Signup from './Signup';
import config from '../config.json';

export default function Login({ closeLoginModal }) {
    const [accountID, setAccountID] = useState('');
    const [password, setPassword] = useState('');
    const [isModalVisible, setIsModalVisible] = useState(false);

    const navigation = useNavigation();

    const Login = async () => {
        try {
            const formData = {
                accountid: accountID,
                password: password,
            };

            const jsonString = JSON.stringify(formData);

            const LoginUrl = config.serverIP + '/login';
            // Axios를 사용하여 POST 요청 보내기
            const Loginresponse = await axios.post(LoginUrl, jsonString, {
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            try {
                var AccountID = Loginresponse.data.data.accountid.toString();
                var UserName = Loginresponse.data.data.username.toString();
                await AsyncStorage.setItem("AccountID", AccountID);
                await AsyncStorage.setItem("UserName", UserName);
                console.log(AccountID);

            } catch (e) {
                // 오류 처리
                console.error('데이터 저장 오류:', e);
            }
            closeLoginModal();

        } catch (error) {
            alert('로그인 실패');
            console.error('로그인 요청 실패:', error);
            // 요청 실패 시 다음 작업을 수행하세요.
        }
    };

    const openSignupModal = () => {
        setIsModalVisible(true);
    };

    const closeSignupModal = () => {
        setIsModalVisible(false); // 모달을 닫기 위해 상태를 false로 설정
    };

    return (
        <SafeAreaView>
            <View style={styles.container}>
                <Text style={styles.title}>로그인</Text>
                <TextInput
                    style={styles.textInput}
                    placeholder="아이디"
                    onChangeText={text => setAccountID(text)}
                    value={accountID}
                />
                <TextInput
                    style={styles.textInput}
                    placeholder="비밀번호"
                    secureTextEntry={true}
                    onChangeText={text => setPassword(text)}
                    value={password}
                />
                <TouchableOpacity style={styles.loginbutton} onPress={Login}>
                    <Text style={styles.loginbuttonText}>로그인</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.signupbutton} onPress={openSignupModal}>
                    <Text style={styles.signupbuttonText}>회원가입</Text>
                </TouchableOpacity>
            </View>
            <Modal
                animationType="slide"
                transparent={true}
                visible={isModalVisible}
                onRequestClose={closeSignupModal}
            >
                <Signup onClose={closeSignupModal} />
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
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
    loginbutton: {
        width: '80%',  // 버튼의 너비를 조절합니다.
        padding: 10,  // 버튼 내부의 패딩을 설정합니다.
        backgroundColor: 'red',  // 버튼의 배경색을 설정합니다.
        borderColor: '#000000',
        borderRadius: 5,  // 버튼의 모서리를 둥글게 만듭니다.
        alignItems: 'center',  // 텍스트를 버튼의 중앙에 정렬합니다.
        margin: 10,
    },
    loginbuttonText: {
        color: '#000000',
        fontSize: 16,
        fontWeight: 'bold',
    },
    signupbutton: {
        width: '80%',  // 버튼의 너비를 조절합니다.
        padding: 10,  // 버튼 내부의 패딩을 설정합니다.
        backgroundColor: '#ffffff',  // 버튼의 배경색을 설정합니다.
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

