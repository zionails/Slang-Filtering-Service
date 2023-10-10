import React, { useState, useEffect } from 'react';
import { TextInput, Button, View, StyleSheet, Image, SafeAreaView, Animated, TouchableWithoutFeedback, Keyboard, Text } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Toast from "react-native-toast-message";
import axios from 'axios';

export default function Manages() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [answerImageUris, setAnswerImageUris] = useState([]);

  const pickAnswerImage = async () => {
    if (answerImageUris.length >= 3) {
      alert('최대 3개의 이미지만 선택할 수 있습니다.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setAnswerImageUris([...answerImageUris, result.assets[0].uri]);
    }
  };

  const removeImage = (index) => {
    const newImageUris = [...answerImageUris];
    newImageUris.splice(index, 1);
    setAnswerImageUris(newImageUris);
  };

  const submitForm = async () => {
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          <TextInput
            style={[styles.input]}
            placeholder="제목"

            value={title}
            onChangeText={setTitle}
          />

          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="내용"
            mode="outlined"
            multiline
            numberOfLines={10}
            value={content}
            onChangeText={setContent}
            theme={{ colors: { primary: '#6200ea' } }}
          />

          <View style={styles.imageRow}>
            {answerImageUris.map((uri, index) => (
              <View key={index} style={{ position: 'relative', margin: 5 }}>
                <Image source={{ uri }} style={styles.answerImage} />
                <TouchableWithoutFeedback onPress={() => removeImage(index)}>
                  <View style={styles.deleteButton}>
                    <Text style={{ color: 'white', fontWeight: 'bold' }}>X</Text>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            ))}
          </View>
          <Button title="이미지 선택" onPress={pickAnswerImage} />

          <View style={styles.footer}>
            <Button
              title="작성"
              onPress={submitForm}
              disabled={isSubmitting}
              style={styles.submitButton}
              mode="contained" // isSubmitting이 true이면 버튼을 비활성화
            />
          </View>
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
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
  input: {
    borderWidth: 0.7,
    borderColor: "gray",
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
  answerImage: {
    width: 100,
    height: 100,
    resizeMode: 'cover',
  },
  deleteButton: {
    position: 'absolute',
    right: -10, // 오른쪽 끝을 이미지의 바깥으로
    top: -10,  // 위쪽 끝을 이미지의 바깥으로
    backgroundColor: 'red',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  imageRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
});
