# --- File: src/create_database.py ---
import os
import shutil
from pathlib import Path
from dotenv import load_dotenv
from langchain_community.document_loaders import DirectoryLoader, PyPDFLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import Chroma
import chromadb

# Get the project root directory (parent of src/)
PROJECT_ROOT = Path(__file__).parent.parent

# Muat environment variables dari .env di root project (override system env vars)
load_dotenv(PROJECT_ROOT / ".env", override=True)

# Path ke data PDF Anda
DATA_PATH = str(PROJECT_ROOT / "data")
# Nama collection di ChromaDB Cloud
CHROMA_COLLECTION_NAME = "pajak_uu"

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

    print("Memulai proses pembuatan database...")
    generate_data_store()
    print("Database berhasil dibuat.")

def generate_data_store():
    documents = load_documents()
    chunks = split_text(documents)
    save_to_chroma(chunks)

def load_documents() -> list[Document]:
    """Memuat dokumen dari DATA_PATH (PDF, Markdown, atau TXT)."""
    print(f"Memuat dokumen dari {DATA_PATH}...")
    
    all_documents = []
    
    # Load PDF files
    try:
        pdf_loader = DirectoryLoader(DATA_PATH, glob="*.pdf", loader_cls=PyPDFLoader)
        pdf_docs = pdf_loader.load()
        all_documents.extend(pdf_docs)
        print(f"  - Memuat {len(pdf_docs)} halaman dari PDF")
    except Exception as e:
        print(f"  - Tidak ada PDF atau error: {e}")
    
    # Load Markdown files
    try:
        md_loader = DirectoryLoader(
            DATA_PATH, 
            glob="*.md", 
            loader_cls=TextLoader,
            loader_kwargs={'encoding': 'utf-8'}
        )
        md_docs = md_loader.load()
        all_documents.extend(md_docs)
        print(f"  - Memuat {len(md_docs)} file Markdown")
    except Exception as e:
        print(f"  - Tidak ada Markdown atau error: {e}")
    
    # Load TXT files
    try:
        txt_loader = DirectoryLoader(
            DATA_PATH, 
            glob="*.txt", 
            loader_cls=TextLoader,
            loader_kwargs={'encoding': 'utf-8'}
        )
        txt_docs = txt_loader.load()
        all_documents.extend(txt_docs)
        print(f"  - Memuat {len(txt_docs)} file TXT")
    except Exception as e:
        print(f"  - Tidak ada TXT atau error: {e}")
    
    print(f"Total: {len(all_documents)} dokumen berhasil dimuat.")
    return all_documents

def split_text(documents: list[Document]) -> list[Document]:
    """Membagi dokumen menjadi chunk yang lebih kecil."""
    print("Memulai pemisahan teks menjadi chunks...")
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=3000,  # Increased from 1000 to reduce total chunks
        chunk_overlap=200,  # Reduced from 300
        length_function=len,
        add_start_index=True,
    )
    chunks = text_splitter.split_documents(documents)
    print(f"Berhasil membagi {len(documents)} dokumen menjadi {len(chunks)} chunks.")
    return chunks

def save_to_chroma(chunks: list[Document]):
    """Menyimpan chunks ke ChromaDB (Cloud atau Self-hosted)."""
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

    # Inisialisasi embedding function
    embedding_function = OpenAIEmbeddings()

    # Dapatkan atau buat collection
    try:
        client.delete_collection(name=CHROMA_COLLECTION_NAME)
        print(f"Collection '{CHROMA_COLLECTION_NAME}' lama berhasil dihapus.")
    except Exception as e:
        print(f"Collection lama tidak ditemukan atau gagal dihapus (ini wajar): {e}")

    print(f"Membuat collection baru '{CHROMA_COLLECTION_NAME}' dan menyimpan dokumen...")
    
    # Upload in batches to avoid OpenAI API token limits
    # OpenAI embedding API has a limit of ~300k tokens per request
    # With average ~500 tokens per chunk, we can safely do ~100 chunks per batch
    BATCH_SIZE = 100
    total_chunks = len(chunks)
    
    # Create initial collection with first batch
    print(f"Uploading {total_chunks} chunks in batches of {BATCH_SIZE}...")
    
    for i in range(0, total_chunks, BATCH_SIZE):
        batch = chunks[i:i + BATCH_SIZE]
        batch_num = (i // BATCH_SIZE) + 1
        total_batches = (total_chunks + BATCH_SIZE - 1) // BATCH_SIZE
        
        print(f"  Batch {batch_num}/{total_batches}: Uploading chunks {i+1} to {min(i+BATCH_SIZE, total_chunks)}...")
        
        if i == 0:
            # First batch: create collection
            db = Chroma.from_documents(
                documents=batch,
                embedding=embedding_function,
                client=client,
                collection_name=CHROMA_COLLECTION_NAME
            )
        else:
            # Subsequent batches: add to existing collection
            db.add_documents(batch)
    
    print(f"Berhasil menyimpan {total_chunks} chunks ke {CHROMA_COLLECTION_NAME}!")

if __name__ == "__main__":
    main()