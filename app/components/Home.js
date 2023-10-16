import React, { useState, useEffect, useRef } from 'react';
import {
    View, FlatList, StyleSheet, Button, Modal, Dimensions,
    Image, TouchableWithoutFeedback, SafeAreaView, ScrollView,
    TextInput, TouchableOpacity
} from 'react-native';
import { Card, Text } from 'react-native-elements';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import Toast from 'react-native-toast-message';

const InquiryContent = ({ item, openModal }) => (
    <TouchableWithoutFeedback onPress={() => openModal(item, item)}>
        <Card containerStyle={styles.cardContainer}>
            <Card.Title>{item.Title}</Card.Title>
            <Card.Divider />
            <View style={styles.cardContent}>
                <Text style={styles.cardText}>{item.Contents}</Text>
                <Text style={styles.cardDate}>{item.WriteDate}</Text>
            </View>
        </Card>
    </TouchableWithoutFeedback>
);

const AnswerContent = ({ answer }) => (
    <View>
        <Text style={styles.modalText}>{answer}</Text>
    </View>
);

const ImagePreview = ({ images, toggleImageSize }) => (
    <View style={styles.imagePreviewContainer}>
        {images?.split(',').filter(url => url.trim() !== '').map((url, index) => (
            <TouchableWithoutFeedback key={index} onPress={() => toggleImageSize(url)}>
                <Image
                    style={styles.thumbnailImage}
                    source={{ uri: url }}
                />
            </TouchableWithoutFeedback>
        ))}
    </View>
);

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

  const toggleImageSize = (url) => {
    setCurrentFullImageUrl(url);
    setShowFullImage(true);
  };

  const fetchData = async (checkNextPage = false) => {

    let nextPage = checkNextPage ? pageno + 1 : pageno;

    const requestData = {
      UserName,
      AccountID,
      pageno: nextPage,
    };

    let response;
    try {
      response = await axios.post('목록불러오기API', requestData);
      if (response.data.StatusCode === 200) {
        if (response.data.inquiries.length === 0) {
          setLastPage(true);
        } else {
          setLastPage(false);
          if (!checkNextPage) {
            setPosts(response.data.inquiries);
          }
        }
      }
    } catch (error) {
      console.error('API 요청 오류:', error);
    }
  };

  const pickAnswerImage = async () => {
    if (images.length >= 3) {
      alert('최대 3개의 이미지만 선택할 수 있습니다.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: false,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImages([...images, result.assets[0].uri]);
    }
  };

  const Answer = async () => {
    setIsAnswering(true);
    // 이미지 업로드 결과를 저장할 배열
    const fileUrls = [];

    // 서버 엔드포인트 URL 설정
    const imageapiUrl = '글쓰기 API';
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
        if (isNetworkError(error.message)) {
          // 네트워크 오류가 발생한 경우 토스트 메시지를 표시
          handleNetworkError();
        }
        setIsAnswering(false);
        return null;
      }
    }
    const fileUrlsString = fileUrls.join(',');

    try {
      const formData = {
        InquiryNumber: selectedItem.ID,
        InquiryValue: selectedItem.Contents,
        AnswerFileAttach: fileUrlsString,
      };
      console.log(formData)

      const jsonString = JSON.stringify(formData);

      // 서버 엔드포인트 URL 설정
      const apiUrl2 = '글쓰기API';

      // Axios를 사용하여 POST 요청 보내기
      const respone = await axios.post(apiUrl2, jsonString, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      console.log(respone.data)

    } catch (error) {
      // 오류 처리
      console.error("AppMain: ", error);
      if (isNetworkError(error.message)) {
        // 네트워크 오류가 발생한 경우 토스트 메시지를 표시
        handleNetworkError();
      }
      setIsAnswering(false);
      return null;
    }
    fetchData();

    setShowFullImage(false);
    setAnswer('');
    setImages([]);
    setSelectedItem(null);
    setIsAnswering(false);
    setModalVisible(false);
  };

  const removeImage = (index) => {
    const newImageUris = [...images];
    newImageUris.splice(index, 1);
    setImages(newImageUris);
  };

  const handleAnswerChange = (text) => {
    setAnswer(text);
  };

  // useEffect(() => {
  //   fetchData();
  // }, [pageno]);

  useEffect(() => {
    setPosts(
      [{
        ID: 1,
        Title: "제목 테스트",
        Contents: "내용 테스트",
        WriteDate: "2023-10-09 14:34:56"
      }]
    );
  }, []);

  const openModal = (post, item) => {
    setSelectedPost(post);
    setSelectedItem({
      Title: item.Title,
      Contents: item.Contents      
    });
    if (item.AnswerContents) {
      // selectedPost에 AnswerFilePath가 존재하면 이미지를 images 상태에 추가
      setAnswer(item.AnswerContents);
    } else {
      setAnswer(''); // 이미지가 없을 경우 초기화
    }
    if (item.AnswerFilePath) {
      // selectedPost에 AnswerFilePath가 존재하면 이미지를 images 상태에 추가
      setImages(item.AnswerFilePath.split(',').filter(url => url.trim() !== ''));
    } else {
      setImages([]); // 이미지가 없을 경우 초기화
    }
    setModalVisible(true);
  };

  const closeModal = () => {
    setShowFullImage(false);  // 모달을 닫을 때 이미지 확대 상태도 초기화
    setAnswer('');
    setImages([]);
    setModalVisible(false);
  };

  const openModalWithImage = (post, url, item) => {
    setSelectedPost(post);
    setSelectedItem({
      Title: item.Title,
      Contents: item.Contents
    });
    setModalVisible(true);
    toggleImageSize(url);
  };

  const renderItem = ({ item }) => (
    <SafeAreaView>
        <ScrollView>
            <InquiryContent item={item} openModal={openModal} />
            <Modal
                transparent={false}
                visible={modalVisible}
                onRequestClose={closeModal}
            >
                <View style={styles.modalContainer}>
                    <AnswerContent answer={answer} />
                    {selectedPost?.Filepath && (
                        <ImagePreview images={selectedPost?.Filepath} toggleImageSize={toggleImageSize} />
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
        </ScrollView>
    </SafeAreaView>
);

  const { width, height } = Dimensions.get('window');

  const isNetworkError = (errorMessage) => {
    return errorMessage.toLowerCase().includes("network");
  }

  const handleNetworkError = () => {
    Toast.show({
      type: 'error',
      position: 'bottom',
      text1: '네트워크 오류',
      text2: '인터넷 연결을 확인하세요.',
      visibilityTime: 3000, // 토스트 메시지가 표시되는 시간 (밀리초)
      autoHide: true,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={posts}
        renderItem={renderItem}
        keyExtractor={item => item.ID.toString()}
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
                <Text style={styles.modalTitle}>{selectedPost?.Title}</Text>
                <Text style={styles.modalText}>{selectedPost?.Contents}</Text>
                <Text style={styles.modalDate}>{selectedPost?.WriteDate}</Text>
                {selectedPost?.Filepath && (
                  <View style={styles.imagePreviewContainer}>
                    {selectedPost?.Filepath.split(',').filter(url => url.trim() !== '').map((url, index) => (
                      <TouchableWithoutFeedback key={index} onPress={() => toggleImageSize(url)}>
                        <Image
                          style={styles.thumbnailImage}
                          source={{ uri: url }}
                        />
                      </TouchableWithoutFeedback>
                    ))}
                  </View>
                )}
              </ScrollView>
            </SafeAreaView>
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
});