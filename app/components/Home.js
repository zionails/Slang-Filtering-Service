import React, { useState, useEffect, useRef } from 'react';
import {
  View, FlatList, StyleSheet, Button, Modal, Dimensions,
  Image, TouchableWithoutFeedback, SafeAreaView, ScrollView,
  TouchableOpacity, Alert 
} from 'react-native';
import { TextInput } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { Card, Text } from 'react-native-elements';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import config from '../config.json';

export default function Home() {
  const [posts, setPosts] = useState([]);
  const [answer, setAnswer] = useState('');
  const [pageno, setPageno] = useState(1);
  const [images, setImages] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [lastPage, setLastPage] = useState(true);
  const [showFullImage, setShowFullImage] = useState(false);
  const [currentFullImageUrl, setCurrentFullImageUrl] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isAnswering, setIsAnswering] = useState(false);
  const [logindata, setLogindata] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');


  const [errorDialogVisible, setErrorDialogVisible] = useState(false);

  const showErrorDialog = () => setErrorDialogVisible(true);
  const hideErrorDialog = () => setErrorDialogVisible(false);


  const fetchData = async (checkNextPage = false) => {

    let nextPage = checkNextPage ? pageno + 1 : pageno;
    console.log(nextPage)
    const requestData = {
      page: nextPage,
    };

    const jsonString = JSON.stringify(requestData);

    const PostUrl = config.serverIP + '/post';

    try {
      const response = await axios.post(PostUrl, jsonString, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (response.data.status === 200) {
        if (response.data.posts.length === 0) {
          setLastPage(true);
        } else {
          setLastPage(false);
          if (!checkNextPage) {
            setPosts(response.data.posts);
          }
        }
      }
    } catch (error) {
      console.error('API 요청 오류:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, [pageno]);

  const openModal = async (post, item) => {
    try {
      const accountid = await AsyncStorage.getItem('AccountID');
      if (accountid !== null) {
        setLogindata(accountid)
      } else {
        setLogindata('')
      }

      setSelectedPost(post);
      setSelectedItem({
        Title: item.title,
        Contents: item.content
      });

      if (item.image_url) {
        // selectedPost에 AnswerFilePath가 존재하면 이미지를 images 상태에 추가
        setImages(item.image_url.split(',').filter(url => url.trim() !== ''));
      } else {
        setImages([]); // 이미지가 없을 경우 초기화
      }
    } catch (error) {
      console.error('데이터 로딩 중 오류 발생:', error);
    }
    setModalVisible(true);
  };

  const closeModal = () => {
    setShowFullImage(false);  // 모달을 닫을 때 이미지 확대 상태도 초기화
    setAnswer('');
    setImages([]);
    setModalVisible(false);
    fetchData();
  };

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
    setImages(images.filter(url => url !== uri));
  };


  useEffect(() => {
    // selectedPost가 변경될 때마다 title 상태 업데이트
    setTitle(selectedPost?.title || '');
    setContent(selectedPost?.content || '');
    if (selectedPost?.image_url) {
      const imageUrls = selectedPost.image_url.split(',').filter(url => url.trim() !== '');
      setImages(imageUrls);
      console.log(imageUrls);
    } else {
      setImages([]);
    }
  }, [selectedPost]);

  // 수정 및 삭제 핸들러 함수
  const handleEdit = async (selectedPost) => {
    try {
      setIsAnswering(true);
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

      formData.append('post_id', selectedPost?.id);
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

      console.log(formData)

      const UpdateURL = config.serverIP + '/update';
      // Axios를 사용하여 POST 요청 보내기
      const Writeresponse = await axios.post(UpdateURL, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log(Writeresponse.data.result.toString());
      if (Writeresponse.data.result.toString() == 'success') {
        // 'clean'이 아니면 비속어가 감지된 것으로 간주하고 알림을 표시합니다.
        Alert.alert(
          "수정 완료",
          "게시물이 성공적으로 수정되었습니다.",
          [
            { text: "확인", onPress: () => closeModal() }
          ],
          { cancelable: false }
        );
      } else if (Writeresponse.data.result.toString() !== 'clean') {
        // 'clean'이 아니면 비속어가 감지된 것으로 간주하고 알림을 표시합니다.
        Alert.alert(
          "비속어 감지",
          "비속어가 감지되었습니다.\n유형 : "+ Writeresponse.data.result.toString(),
          [{ text: "OK", onPress: () => console.log("OK Pressed") }]
        );
      }
      setIsAnswering(false);

    } catch (error) {
      alert('수정 실패');
      console.error('수정 요청 실패:', error);
    }
  };

  const handleDelete = async (selectedPost) => {
    try {
      setIsAnswering(true);
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

      const formData = {
        post_id: "" + selectedPost?.id,
        user_id: AccountID,
      };

      const jsonString = JSON.stringify(formData);

      console.log(jsonString);

      const DeleteURL = config.serverIP + '/delete';
      // Axios를 사용하여 POST 요청 보내기
      const Deleteresponse = await axios.post(DeleteURL, jsonString, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log(Deleteresponse.data.result.toString());
      if (Deleteresponse.data.result.toString() == 'success') {
        // 'clean'이 아니면 비속어가 감지된 것으로 간주하고 알림을 표시합니다.
        Alert.alert(
          "삭제 완료",
          "게시물이 성공적으로 삭제되었습니다.",
          [
            { text: "확인", onPress: () => closeModal() }
          ],
          { cancelable: false }
        );
      }
      setIsAnswering(false);

    } catch (error) {
      alert('삭제 실패');
      setIsAnswering(false);
    }
  };

  const renderItem = ({ item }) => (
    <SafeAreaView>
      <ScrollView>
        <TouchableWithoutFeedback onPress={() => openModal(item, item)}>
          <Card containerStyle={styles.cardContainer}>
            <Card.Title style={{ color: "#000000" }}>{item.title}</Card.Title>
            <Card.Divider />
            <View style={styles.cardContent}>
              <Text style={styles.cardText}>{item.content}</Text>
              <Text style={styles.cardDate}>{item.date}</Text>
              <View style={styles.imagePreviewContainer}>
                {item.image_url?.split(',').filter(url => url.trim() !== '').map((url, index) => (
                  <TouchableWithoutFeedback key={index}>
                    <Image
                      style={styles.thumbnailImage}
                      source={{ uri: url }}
                    />
                  </TouchableWithoutFeedback>
                ))}
              </View>
            </View>
          </Card>
        </TouchableWithoutFeedback>
      </ScrollView>
    </SafeAreaView>
  );

  const { width, height } = Dimensions.get('window');

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={posts}
        renderItem={renderItem}
        keyExtractor={item => item.id}
      />
      <View style={styles.buttonContainer}>
        <Button title="이전" onPress={() => setPageno(prev => Math.max(prev - 1, 1))} disabled={pageno === 1} />
        <Button title="다음" onPress={() => setPageno(prev => prev + 1)} disabled={lastPage} />
      </View>
      <Modal
        transparent={false}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <View style={styles.modalContainer}>
          {showFullImage ? (
            <TouchableWithoutFeedback onPress={() => setShowFullImage(false)}>
              <Image
                style={{ width: width * 0.8, height: height * 0.8 }}
                source={{ uri: currentFullImageUrl }}
              />
            </TouchableWithoutFeedback>
          ) : (
            <SafeAreaView>
              <ScrollView>
                {logindata == selectedPost?.user_id ? (
                  <TextInput
                    style={styles.modalTitle}
                    label="제목"
                    mode="outlined"
                    value={title}
                    onChangeText={setTitle}
                    theme={{ colors: { primary: '#6200ea' } }}
                  />
                ) : (
                  <Text style={styles.modalTitle}>{selectedPost?.title}</Text>
                )}
                {logindata == selectedPost?.user_id ? (
                  <TextInput
                    style={styles.modalTitle}
                    label="내용"
                    mode="outlined"
                    value={content}
                    onChangeText={setContent}
                    theme={{ colors: { primary: '#6200ea' } }}
                  />
                ) : (
                  <Text style={styles.modalText}>{selectedPost?.content}</Text>
                )}
                <Text style={styles.modalDate}>{selectedPost?.date}</Text>
                {logindata == selectedPost?.user_id ? (
                  <View style={styles.imagesContainer}>
                    {images.map((url, index) => (
                      <TouchableWithoutFeedback key={index}>
                        <View style={styles.imageContainer}>
                          <Image
                            style={styles.image}
                            source={{ uri: url }}
                          />
                          <TouchableOpacity onPress={() => removeImage(url)}>
                            <MaterialIcons name="cancel" size={24} color="red" style={styles.icon} />
                          </TouchableOpacity>
                        </View>
                      </TouchableWithoutFeedback>
                    ))}
                  </View>
                ) : (
                  images.map((url, index) => (
                    <TouchableWithoutFeedback key={index}>
                      <Image
                        style={styles.thumbnailImage}
                        source={{ uri: url }}
                      />
                    </TouchableWithoutFeedback>
                  ))
                )
                }

              </ScrollView>
            </SafeAreaView>
          )}
          {logindata == selectedPost?.user_id && (
            <View>
              <TouchableOpacity
                style={[styles.imageButton, isAnswering && styles.disabledButton]}
                onPress={pickImage}
                disabled={isAnswering}
              >
                <Text style={[styles.buttonText, isAnswering && styles.disabledButtonText]}>이미지 추가</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.updateButton, isAnswering && styles.disabledButton]}
                onPress={() => handleEdit(selectedPost)}
                disabled={isAnswering}
              >
                <Text style={[styles.buttonText, isAnswering && styles.disabledButtonText]}>수정</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.DeleteButton, isAnswering && styles.disabledButton]}
                onPress={() => handleDelete(selectedPost)}
                disabled={isAnswering}
              >
                <Text style={[styles.buttonText, isAnswering && styles.disabledButtonText]}>삭제</Text>
              </TouchableOpacity>
            </View>
          )}
          <TouchableOpacity
            style={[styles.closeButton, isAnswering && styles.disabledButton]}
            onPress={closeModal}
            disabled={isAnswering}
          >
            <Text style={[styles.buttonText, isAnswering && styles.disabledButtonText]}>닫기</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20,
  },
  cardContainer: {
    borderRadius: 10,
  },
  cardContent: {
    flex: 1,
    flexDirection: 'column',
  },
  cardText: {
    marginBottom: 10,
  },
  cardImage: {
    marginBottom: 10,
  },
  cardDate: {
    textAlign: 'right',
    fontStyle: 'italic',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
  },
  // 모달의 스타일을 업데이트
  modalContainer: {
    flex: 1,
    margin: 10,
    backgroundColor: '#f9f9f9',  // 모달의 배경색을 변경
    borderRadius: 5,  // 모달의 모서리를 둥글게
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  imagePreviewContainer: {
    flexDirection: 'column',  // 세로로 배열
    marginBottom: 10,
  },
  imageRow: {
    flexDirection: 'row',  // 가로로 이미지를 정렬
    alignItems: 'center',  // 센터 정렬
  },
  imagePreviewText: {
    marginBottom: 10,  // 텍스트와 이미지 사이의 간격
  },
  thumbnailImage: {
    width: 70,
    height: 70,
    marginRight: 10,  // 이미지와 이미지 사이의 간격
    marginBottom: 10,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  fullImageView: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    zIndex: 3,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  modalText: {
    fontSize: 18,
    marginBottom: 20,
  },
  modalDate: {
    fontSize: 16,
    fontStyle: 'italic',
    marginBottom: 20,
  },
  IosModalDetail: {
    marginTop: 500,
  },
  TextInput: {
    flex: 1,
    borderWidth: 1,
    marginBottom: 20,
    marginTop: 20,
  },
  answerImage: {
    width: 100,
    height: 100,
    resizeMode: 'cover',
  },
  deleteButton: {
    position: 'absolute',
    right: -10,
    top: -10,
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
  imageButton: {
    height: 30,
    justifyContent: 'center',
    backgroundColor: "gray",
    marginBottom: 10,
  },
  AnswerButton: {
    height: 30,
    justifyContent: 'center',
    backgroundColor: "red",
    marginBottom: 10,
  },
  closeButton: {
    height: 30,
    justifyContent: 'center',
    backgroundColor: "blue",
  },
  updateButton: {
    height: 30,
    justifyContent: 'center',
    backgroundColor: "purple",
    marginBottom: 10,
  },
  DeleteButton: {
    height: 30,
    justifyContent: 'center',
    backgroundColor: "red",
    marginBottom: 10,
  },
  buttonText: {
    color: "white",
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 16,
  },
  disabledButton: {
    backgroundColor: 'gray', // 비활성화 상태일 때 배경색을 회색으로 설정
  },
  disabledButtonText: {
    color: 'white', // 비활성화 상태일 때 텍스트 색상을 흰색으로 설정
  },
  icon: {
    position: 'absolute',
    top: -112,
    right: -10,
  },
  imageContainer: {
    position: 'relative',
    marginRight: 8,
  },
  imagesContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
});