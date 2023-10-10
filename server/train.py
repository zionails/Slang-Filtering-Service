from transformers import BertTokenizer, BertForSequenceClassification, TrainingArguments, Trainer, TrainerCallback
import torch
import pandas as pd

# 데이터 불러오기
train_data = pd.read_csv("DataSet/kor_unsmile_train.csv")
valid_data = pd.read_csv("DataSet/kor_unsmile_valid.csv")

# 토크나이저 초기화
tokenizer = BertTokenizer.from_pretrained('beomi/kcbert-base')

# 레이블 설정
labels = ["여성/가족", "남성", "성소수자", "인종/국적", "연령", "지역", "종교", "기타 혐오", "악플/욕설", "clean"]
num_labels = len(labels)


# 데이터 전처리 함수
def preprocess_data(data, labels):
    sentences = data["문장"].tolist()
    label_data = data[labels].to_numpy()

    # 토크나이징
    tokenized_data = tokenizer(sentences, padding=True, truncation=True, return_tensors="pt")

    # 입력 데이터와 라벨 설정
    input_ids = tokenized_data["input_ids"]
    attention_mask = tokenized_data["attention_mask"]
    labels = torch.tensor(label_data, dtype=torch.float)

    return {
        "input_ids": input_ids,
        "attention_mask": attention_mask,
        "labels": labels
    }


# Train 및 Validation 데이터 전처리
train_dataset = preprocess_data(train_data, labels)
valid_dataset = preprocess_data(valid_data, labels)


# PyTorch Dataset 클래스 생성
class CustomDataset(torch.utils.data.Dataset):
    def __init__(self, data):
        self.data = data

    def __len__(self):
        return len(self.data["input_ids"])

    def __getitem__(self, idx):
        return {
            "input_ids": self.data["input_ids"][idx],
            "attention_mask": self.data["attention_mask"][idx],
            "labels": self.data["labels"][idx]
        }


class CustomCallback(TrainerCallback):
    def on_log(self, args, state, control, logs=None, **kwargs):
        if logs:
            print(f"Step {state.global_step}: Training Loss: {logs.get('loss', 'N/A')}")


train_dataset = CustomDataset(train_dataset)
valid_dataset = CustomDataset(valid_dataset)

# 모델 초기화
model = BertForSequenceClassification.from_pretrained('beomi/kcbert-base', num_labels=num_labels)

# 트레이닝 설정
training_args = TrainingArguments(
    output_dir="./results",
    num_train_epochs=1,  # 학습 에포크 수
    per_device_train_batch_size=16,
    per_device_eval_batch_size=16,
    warmup_steps=500,
    weight_decay=0.01,
)

# 트레이너 초기화
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=valid_dataset,
    callbacks=[CustomCallback()],
)

# 모델 학습
trainer.train()

# 모델 저장
model.save_pretrained("./saved_model")

# 저장된 모델로부터 불러오기
loaded_model = BertForSequenceClassification.from_pretrained("./saved_model")

# 테스트할 문장
test_sentences = ["이 문장은 테스트용입니다.", "이것도 테스트 문장입니다."]

# 토크나이징
test_tokenized = tokenizer(test_sentences, padding=True, truncation=True, return_tensors="pt")

# 예측
with torch.no_grad():
    outputs = loaded_model(**test_tokenized)
    logits = outputs.logits
    predictions = torch.sigmoid(logits)

# 예측 결과 출력
print("예측 결과:", predictions)

# 레이블에 따른 예측 결과 출력
for i, pred in enumerate(predictions):
    print(f"문장: {test_sentences[i]}")
    for label, score in zip(labels, pred):
        print(f"{label}: {score.item():.4f}")
