import streamlit as st
import google.generativeai as genai

# 페이지 설정
st.set_page_config(page_title="나만의 AI 챗봇", page_icon="🤖")

# 제목
st.title("🤖 무엇이든 물어보세요")

# 1. API 키 설정 (비밀번호처럼 숨겨진 키를 가져옴)
try:
    genai.configure(api_key=st.secrets["GOOGLE_API_KEY"])
except:
    st.error("API 키가 설정되지 않았습니다. Streamlit 배포 설정에서 Secrets를 확인해주세요.")
    st.stop()

# 2. 모델 설정 (Gemini Pro)
model = genai.GenerativeModel('gemini-1.5-flash')

# 3. 채팅 기록 초기화 (없으면 빈 리스트로 시작)
if "messages" not in st.session_state:
    st.session_state.messages = []

# 4. 이전 대화 내용 화면에 출력
for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

# 5. 사용자 입력 받기
if prompt := st.chat_input("질문을 입력하세요..."):
    # 사용자 메시지 화면에 표시
    with st.chat_message("user"):
        st.markdown(prompt)
    # 대화 기록에 저장
    st.session_state.messages.append({"role": "user", "content": prompt})

    # 6. AI 응답 생성
    with st.chat_message("assistant"):
        message_placeholder = st.empty()
        full_response = ""
        
        try:
            # AI에게 질문 전달 (과거 대화 맥락 포함하고 싶으면 history 관리 필요)
            chat = model.start_chat(history=[]) 
            response = chat.send_message(prompt, stream=True)
            
            for chunk in response:
                if chunk.text:
                    full_response += chunk.text
                    message_placeholder.markdown(full_response + "▌")
            message_placeholder.markdown(full_response)
            
            # AI 응답 기록에 저장
            st.session_state.messages.append({"role": "assistant", "content": full_response})
            
        except Exception as e:
            st.error(f"에러가 발생했습니다: {e}")
