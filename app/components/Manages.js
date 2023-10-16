import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Image, TouchableOpacity, SafeAreaView, Animated, TouchableWithoutFeedback, Keyboard, Text, } from 'react-native';
import { TextInput, Button, Portal, Dialog, RadioButton, Provider, Paragraph } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import Toast from "react-native-toast-message";
import axios from 'axios';

// 분류(카테고리)

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
  };

  const removeImage = (uri) => {
    setImages(images.filter(image => image !== uri));
  };

  const submitForm = async () => {
    setIsSubmitting(true);
    try {
      // 이미지 업로드 결과를 저장할 배열
      const fileUrls = [];

      // 서버 엔드포인트 URL 설정
      const imageapiUrl = '글쓰기API';
      for (let i = 0; i < images.length; i++) {
        const filePath = images[i].replace('file://', '');
        const fileData = {
          uri: images[i],
          type: 'image/jpeg',
          name: `${filePath.split('/').pop()}`,
        };

        const imageData = new FormData();
        imageData.append('image', fileData);

        try {
          const imageresponse = await axios.post(imageapiUrl, imageData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });

          const fileUrl = imageresponse.data.fileUrl;
          fileUrls.push(fileUrl);
        } catch (error) {
          console.error("AppInquriy:", error);
          return null;
        }
      }

      const formData = {
        Contents: content,
        file1: fileUrls.length > 0 ? fileUrls[0] : '',
        file2: fileUrls.length > 0 ? fileUrls[1] : '',
        file3: fileUrls.length > 0 ? fileUrls[2] : ''
      };

      const jsonString = JSON.stringify(formData);

      // 서버 엔드포인트 URL 설정
      const apiUrl2 = 'https://findbin.uiharu.dev/app/api/AppInquiry/api.php';

      // Axios를 사용하여 POST 요청 보내기
      const response = await axios.post(apiUrl2, jsonString, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log(fileUrls);

      // 원하는 서버 응답 처리 로직을 추가하세요.
      setContent('');
      setEmail('');
      setImages([]);
      // Toast 메시지 표시 (제출 성공 여부에 따라 다른 메시지 출력 가능)
      Toast.show({
        text1: "제출이 완료되었습니다.",
      });
    } catch (error) {
      console.error("AppInquriy:", error);
      // Toast 메시지 표시 (제출 실패 메시지)
      Toast.show({
        text1: "제출에 실패하였습니다. 다시 시도해주세요.",
      });
    } finally {
      // 작업이 완료되면 제출 상태를 다시 활성화
      setIsSubmitting(false);
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
              multiline
              numberOfLines={10}
              value={content}
              onChangeText={setContent}
              theme={{ colors: { primary: '#6200ea' } }}
            />

            <Button icon="camera" mode="contained" onPress={pickImage} style={styles.button}>
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

