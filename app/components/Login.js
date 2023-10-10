import React, { useState } from 'react';
import { View, Text, TextInput, Button, Modal } from 'react-native';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Signup from './Signup';

export default function Login({ closeLoginModal }) {
    const [accountID, setAccountID] = useState('');
    const [password, setPassword] = useState('');
    const [isModalVisible, setIsModalVisible] = useState(false);

    const navigation = useNavigation();

    const Login = async () => {
        try {
            // const formData = {
            //     AccountID: accountID,
            //     Passwords: password,
            // };

            // const jsonString = JSON.stringify(formData);

            // const LoginUrl = 'LoginURL';
            // // Axios를 사용하여 POST 요청 보내기
            // const Loginresponse = await axios.post(LoginUrl, jsonString, {
            //     headers: {
            //         'Content-Type': 'application/json',
            //     },
            // });

            try {
                // var AccountID = Loginresponse.data.message.AccountID.toString();
                // var UserName = Loginresponse.data.message.UserName.toString();
                await AsyncStorage.setItem("AccountID", "1");
                await AsyncStorage.setItem("UserName", "2");

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
            <View>
                <Text>로그인</Text>
                <TextInput
                    placeholder="아이디"
                    onChangeText={text => setAccountID(text)}
                    value={accountID}
                />
                <TextInput
                    placeholder="비밀번호"
                    secureTextEntry={true}
                    onChangeText={text => setPassword(text)}
                    value={password}
                />
                <Button title="로그인" onPress={Login} />
                <Button title="회원가입" onPress={openSignupModal} />
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


