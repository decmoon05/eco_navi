import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { getProductsAPI, exchangeProductAPI } from '../services/api';

const StoreContainer = styled.div`
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
`;

const Title = styled.h1`
  text-align: center;
  color: white;
  margin-bottom: 30px;
`;

const ProductGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
`;

const ProductCard = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  padding: 20px;
  color: #333;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
`;

const ProductInfo = styled.div``;

const ProductIcon = styled.div`
  font-size: 48px;
  text-align: center;
  margin-bottom: 15px;
`;

const ProductName = styled.h3`
  margin: 0 0 10px 0;
  text-align: center;
`;

const ProductDesc = styled.p`
  font-size: 14px;
  color: #666;
  flex-grow: 1;
`;

const ProductFooter = styled.div`
  margin-top: 20px;
  text-align: center;
`;

const PointCost = styled.div`
  font-weight: 700;
  font-size: 1.2rem;
  color: #764ba2;
  margin-bottom: 15px;
`;

const ExchangeButton = styled.button`
  width: 100%;
  padding: 12px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #45a049;
  }

  &:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
`;

interface Product {
  id: number;
  name: string;
  description: string;
  points_required: number;
  icon: string;
}

const StorePage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const response = await getProductsAPI();
        setProducts(response.data);
      } catch (error) {
        console.error("Failed to fetch products:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const handleExchange = async (productId: number) => {
    if (!window.confirm('정말로 이 상품을 교환하시겠습니까?')) return;

    try {
      const response = await exchangeProductAPI(productId);
      alert(response.data.message);
      // TODO: 교환 성공 시 사용자 포인트 정보 갱신
    } catch (error: any) {
      if (error.response) {
        alert(`오류: ${error.response.data.message}`);
      } else {
        alert('상품 교환 중 오류가 발생했습니다.');
      }
    }
  };

  if (loading) {
    return <p style={{ color: 'white', textAlign: 'center' }}>상품 목록을 불러오는 중...</p>;
  }

  return (
    <StoreContainer>
      <Title>🎁 ECO 스토어</Title>
      <ProductGrid>
        {products.map(product => (
          <ProductCard key={product.id}>
            <ProductInfo>
              <ProductIcon>{product.icon}</ProductIcon>
              <ProductName>{product.name}</ProductName>
              <ProductDesc>{product.description}</ProductDesc>
            </ProductInfo>
            <ProductFooter>
              <PointCost>{product.points_required.toLocaleString()} P</PointCost>
              <ExchangeButton onClick={() => handleExchange(product.id)}>교환하기</ExchangeButton>
            </ProductFooter>
          </ProductCard>
        ))}
      </ProductGrid>
    </StoreContainer>
  );
};

export default StorePage;
