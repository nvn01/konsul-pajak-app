# --- File: src/query_data.py ---
import argparse
import os
import warnings
from pathlib import Path
from dotenv import load_dotenv
from langchain_community.vectorstores import Chroma
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
import chromadb

# Suppress deprecation warnings
warnings.filterwarnings('ignore', category=DeprecationWarning)

# Get the project root directory (parent of src/)
PROJECT_ROOT = Path(__file__).parent.parent

# Muat environment variables dari .env di root project (override system env vars)
load_dotenv(PROJECT_ROOT / ".env", override=True)

CHROMA_COLLECTION_NAME = "pajak_uu"

PROMPT_TEMPLATE = """
Jawab pertanyaan hanya berdasarkan konteks berikut:

{context}

---

Jawab pertanyaan berdasarkan konteks di atas: {question}
"""

def main():
    # Cek kredensial
    if not os.environ.get("OPENAI_API_KEY"):
        raise ValueError("OPENAI_API_KEY belum diatur di .env")
    
    # Cek mode ChromaDB (cloud atau self-hosted)
    chroma_mode = os.environ.get("CHROMA_MODE", "cloud").lower()
    
    if chroma_mode == "cloud":
        if not all([
            os.environ.get("CHROMA_API_KEY"),
            os.environ.get("CHROMA_TENANT"),
            os.environ.get("CHROMA_DATABASE")
        ]):
            raise ValueError("Mode cloud memerlukan CHROMA_API_KEY, CHROMA_TENANT, dan CHROMA_DATABASE")
    elif chroma_mode == "local":
        if not os.environ.get("CHROMA_HOST"):
            raise ValueError("Mode local memerlukan CHROMA_HOST (contoh: http://localhost:8000)")

    # Buat parser CLI
    parser = argparse.ArgumentParser()
    parser.add_argument("query_text", type=str, help="Teks pertanyaan Anda.")
    args = parser.parse_args()
    query_text = args.query_text

    print(f"Mencari jawaban untuk: '{query_text}'")

    # Buat koneksi client ke ChromaDB (Cloud atau Self-hosted)
    chroma_mode = os.environ.get("CHROMA_MODE", "cloud").lower()
    
    if chroma_mode == "cloud":
        print("Menghubungkan ke ChromaDB Cloud...")
        client = chromadb.CloudClient(
            api_key=os.environ["CHROMA_API_KEY"],
            tenant=os.environ["CHROMA_TENANT"],
            database=os.environ["CHROMA_DATABASE"]
        )
    else:
        chroma_host = os.environ.get("CHROMA_HOST", "http://localhost:8000")
        print(f"Menghubungkan ke ChromaDB Self-hosted di {chroma_host}...")
        
        # Parse host and port from CHROMA_HOST
        # Format: http://host:port or https://host:port
        if "://" in chroma_host:
            chroma_host = chroma_host.split("://")[1]  # Remove http:// or https://
        
        if ":" in chroma_host:
            host, port = chroma_host.split(":")
            client = chromadb.HttpClient(host=host, port=int(port))
        else:
            client = chromadb.HttpClient(host=chroma_host, port=8000)
    
    # Siapkan embedding function
    embedding_function = OpenAIEmbeddings()

    # Hubungkan ke collection yang sudah ada di cloud
    db = Chroma(
        client=client,  # <-- Gunakan client yang baru
        collection_name=CHROMA_COLLECTION_NAME,
        embedding_function=embedding_function
    )

    # Cari di DB
    results = db.similarity_search_with_relevance_scores(query_text, k=3)
    if len(results) == 0 or results[0][1] < 0.7:
        print("Tidak ditemukan hasil yang relevan.")
        return

    # Siapkan konteks dan prompt
    context_text = "\n\n---\n\n".join([doc.page_content for doc, _score in results])
    prompt_template = ChatPromptTemplate.from_template(PROMPT_TEMPLATE)
    prompt = prompt_template.format(context=context_text, question=query_text)

    # Hasilkan jawaban menggunakan model
    model = ChatOpenAI()
    response_text = model.invoke(prompt)

    # Format dan cetak respons
    print(f"\n{'='*80}")
    print(f"JAWABAN:")
    print(f"{'='*80}")
    print(response_text.content)
    print(f"\n{'='*80}")
    print(f"SUMBER REFERENSI:")
    print(f"{'='*80}")
    
    for i, (doc, score) in enumerate(results, 1):
        source_file = doc.metadata.get("source", "Unknown")
        page = doc.metadata.get("page", "?")
        # Extract just the filename
        filename = Path(source_file).name if source_file else "Unknown"
        
        print(f"\n[{i}] {filename} (halaman {page}) - Relevance: {score:.2f}")
        print("-" * 80)
        # Show first 300 characters of the chunk
        chunk_preview = doc.page_content[:300].strip()
        if len(doc.page_content) > 300:
            chunk_preview += "..."
        print(chunk_preview)
    
    print(f"\n{'='*80}\n")

if __name__ == "__main__":
    main()