from transformers import BertTokenizer, BertForSequenceClassification
import torch


class TextClassifier:

    def __init__(self, model_path, tokenizer_name='beomi/kcbert-base'):
        self.tokenizer = BertTokenizer.from_pretrained(tokenizer_name)
        self.model = self.load_model(model_path)
        self.labels = ["여성/가족", "남성", "성소수자", "인종/국적", "연령", "지역", "종교", "기타 혐오", "악플/욕설", "clean"]

    def load_model(self, model_path):
        return BertForSequenceClassification.from_pretrained(model_path)

    def predict(self, sentences):
        test_tokenized = self.tokenizer(sentences, padding=True, truncation=True, return_tensors="pt")
        with torch.no_grad():
            outputs = self.model(**test_tokenized)
            logits = outputs.logits
            predictions = torch.sigmoid(logits)
        return predictions

    def print_predictions(self, sentences):
        predictions = self.predict(sentences)
        print("예측 결과:", predictions)
        for i, pred in enumerate(predictions):
            print(f"문장: {sentences[i]}")
            for label, score in zip(self.labels, pred):
                print(f"{label}: {score.item():.4f}")


# 사용 예:
# classifier = TextClassifier(model_path="./Model")
# classifier.print_predictions(["이 문장은 테스트용입니다. 시발아 이것도 테스트 문장입니다."])
