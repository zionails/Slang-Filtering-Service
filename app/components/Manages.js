import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Image, TouchableOpacity, SafeAreaView, Animated, TouchableWithoutFeedback, Keyboard, Text, } from 'react-native';
import { TextInput, Button, Portal, Dialog, RadioButton, Provider, Paragraph } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import Toast from "react-native-toast-message";
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import config from '../config.json';

export default function AppInquiry() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [email, setEmail] = useState('');
  const [images, setImages] = useState([]);
  const [visible, setVisible] = useState(false);
  const [theme, setTheme] = useState("light"); // 라이트 모드가 기본값
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [visible5, setVisible5] = useState(false);
  const [checked, setChecked] = useState(null);

  const toggleDialog5 = () => {
    setVisible5(!visible5);
  };

  const hideDialog = () => setVisible(false);

  const [errorDialogVisible, setErrorDialogVisible] = useState(false);

  const showErrorDialog = () => setErrorDialogVisible(true);
  const hideErrorDialog = () => setErrorDialogVisible(false);


  const pickImage = async () => {
    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        quality: 1,
      });

      if (images.length >= 3) {
        showErrorDialog();
        return;
      }

      if (!result.canceled) {
        const uri = result.assets[0].uri;
        setImages([...images, uri]);
      }
    } catch (error) {
      console.error(error);
    }

  };

  const removeImage = (uri) => {
    setImages(images.filter(image => image !== uri));
  };

  const submitForm = async () => {
    try {
      setIsSubmitting(true); 
      var AccountID = await AsyncStorage.getItem('AccountID');
      if (!AccountID) {
        // AccountID가 없으면 로그인이 필요하다는 알림을 표시합니다.
        Alert.alert(
            "로그인 필요",
            "이 기능을 사용하기 위해서는 로그인이 필요합니다.",
            [{ text: "OK", onPress: () => console.log("OK Pressed") }]
        );
        return;
      }
      const formData = new FormData();

      formData.append('title', title);
      formData.append('content', content);
      formData.append('user_id', AccountID);
      // 각 이미지를 formData에 추가합니다.
      images.forEach((image, index) => {
        if (image) {
          // 이미지 URI에서 파일 확장자를 추출하여 MIME 타입을 결정합니다.
          const fileType = image.match(/\.(jpeg|jpg|png)$/i) ? image.match(/\.(jpeg|jpg|png)$/i)[0] : '.jpg';
          const mimeType = (fileType === '.png') ? 'image/png' : 'image/jpeg';

          const imageFile = {
            uri: image,
            type: mimeType, // MIME 타입 동적 할당
            name: `image${index + 1}${fileType}`, // 파일 확장자를 포함한 파일명
          };
          formData.append(`image${index + 1}`, imageFile);
        }
      });

      const WriteURL = config.serverIP + '/write';
      // Axios를 사용하여 POST 요청 보내기
      const Writeresponse = await axios.post(WriteURL, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log(Writeresponse.data.result.toString());
      if (Writeresponse.data.result.toString() == 'success') {
        // 'clean'이 아니면 비속어가 감지된 것으로 간주하고 알림을 표시합니다.
        Alert.alert(
          "작성 완료",
          "게시물이 성공적으로 작성되었습니다.",
          [
            { text: "확인"}
          ],
          { cancelable: false }
        );
        setTitle('');
        setContent('');
        setImages([]);
      } else if(Writeresponse.data.result.toString() !== 'clean'){
        // 'clean'이 아니면 비속어가 감지된 것으로 간주하고 알림을 표시합니다.
        Alert.alert(
          "비속어 감지",
          "비속어가 감지되었습니다.\n유형 : "+ Writeresponse.data.result.toString(),
          [{ text: "OK", onPress: () => console.log("OK Pressed") }]
        );
      }
      setIsSubmitting(false); 

    } catch (error) {
      alert('작성 실패');
      console.error('작성 요청 실패:', error);
      // 요청 실패 시 다음 작업을 수행하세요.
    }
  };

  const [labelAnim] = useState(new Animated.Value(1)); // 애니메이션 값 상태를 추가합니다.

  const labelStyle = {
    fontSize: labelAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [12, 16],
    }),
    top: labelAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 14],
    }),
    color: labelAnim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: ['#6200ea', '#6200ea', '#000'],
    }),
    textAlignVertical: 'center',
  };

  const dynamicStyles = {
    toast: {
      backgroundColor: theme === "dark" ? "#333333" : "#ffffff",
      color: theme === "dark" ? "#ffffff" : "#000000",
    },
    iconColor: {
      color: theme === "dark" ? "#ffffff" : "#000000",
    },
  };


  return (
    <Provider>
      <SafeAreaView style={styles.safeArea}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.container}>
            <TextInput
              style={[styles.input, styles.title]}
              label="제목"
              mode="outlined"
              value={title}
              onChangeText={setTitle}
              theme={{ colors: { primary: '#6200ea' } }}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              label="내용"
              mode="outlined"
              numberOfLines={10}
              value={content}
              onChangeText={setContent}
              theme={{ colors: { primary: '#6200ea' } }}
            />

            <Button icon="camera" mode="contained" onPress={pickImage} style={styles.button} disabled={isSubmitting}>
              이미지 선택
            </Button>

            <Portal>
              <Dialog visible={errorDialogVisible} onDismiss={hideErrorDialog}>
                <Dialog.Title>오류</Dialog.Title>
                <Dialog.Content>
                  <Paragraph>최대 3장까지만 선택할 수 있습니다.</Paragraph>
                </Dialog.Content>
                <Dialog.Actions>
                  <Button onPress={hideErrorDialog}>확인</Button>
                </Dialog.Actions>
              </Dialog>
            </Portal>

            <View style={styles.imagesContainer}>
              {images.map((image, index) => (
                <View key={index} style={styles.imageContainer}>
                  <Image source={{ uri: image }} style={styles.image} />
                  <TouchableOpacity onPress={() => removeImage(image)}>
                    <MaterialIcons name="cancel" size={24} color="red" style={styles.icon} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <View style={styles.footer}>
              <Button
                onPress={submitForm}
                disabled={isSubmitting}
                style={styles.submitButton}
                mode="contained" // isSubmitting이 true이면 버튼을 비활성화
              >제출</Button>
            </View>
            <Toast
              style={dynamicStyles.toast}
              textStyle={{ color: dynamicStyles.toast.color }}
            />
          </View>
        </TouchableWithoutFeedback>
      </SafeAreaView>
    </Provider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  input: {
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 150,
  },
  button: {
    marginBottom: 12,
    backgroundColor: '#6200ea',
  },
  imagesContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  imageContainer: {
    position: 'relative',
    marginRight: 8,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  icon: {
    position: 'absolute',
    top: -10,
    right: -10,
  },
  footer: {
    flex: 1,
    justifyContent: 'flex-end',
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: '#6200ea',
  },
});

