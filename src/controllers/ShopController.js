const ProductService = require('../services/ProductService');
const CateService = require('../services/CateService');
const util = require('../util/Utility');
const product = require('../models/product');
const category = require('../models/category');
const { getDataSlug } = require('../util/Utility');
const detail = require('../models/detail');

let maximumPagination=5;
let currentPage=1;
let nextPage=1;
let prevPage=1;
let totalPage=1;
const itemPerPage=9;

class ShopController{



    shop(req, res, next){

        //Dùng query lấy page
        const pageNumber=req.query.page;
        let name=null;

        currentPage =(pageNumber && !Number.isNaN(pageNumber)) ? parseInt(pageNumber) : 1;
        currentPage = (currentPage > 0) ? currentPage : 1;
        currentPage = (currentPage <= totalPage) ? currentPage : totalPage;

        const productPromises=[
            ProductService.list(itemPerPage,currentPage,name),
            ProductService.getProductTotal(),
        ]


        //đợi promises
        Promise.all(productPromises)
        .then(result=>{
            let products=result[0];
            const totalProduct=result[1];

            //Lấy max số trang
            totalPage=Math.ceil(totalProduct/itemPerPage);

            let paginationArray = [];

            let pageDisplace = Math.min(totalPage - currentPage + 2, maximumPagination);
            if(currentPage === 1){
                pageDisplace -= 1;
            }
            for(let i = 0 ; i < pageDisplace; i++){
                if(currentPage === 1){
                    paginationArray.push({
                        page: currentPage + i,
                        isCurrent:  (currentPage + i)===currentPage
                    });
                }
                else{
                    paginationArray.push({
                        page: currentPage + i - 1,
                        isCurrent:  (currentPage + i - 1)===currentPage
                    });
                }
            }
            if(pageDisplace < 2){
                paginationArray=[];
            }


            //Lấy được product
            //Giờ lấy detail của cái product đó

            const productLength=products.length;
            let detailPromises=[];
    
            
            //console.log(products);
            for (let i=0;i<productLength;i++){
                detailPromises.push(ProductService.getImageLink(products[i].proID));
                detailPromises.push(ProductService.getProductDetail(products[i].proID));
                detailPromises.push(ProductService.getCateName(products[i].catID));
				detailPromises.push(ProductService.getBrandSlug(products[i].brandID));
				detailPromises.push(ProductService.getCateSlug(products[i].catID));
            }

            
            
            //Chuẩn bị render
            Promise.all(detailPromises)
            .then(result=>{
            
                    for (let i=0;i<productLength;i++){
                        products[i].image=result[i*5][0].proImage;
                        products[i].detail=result[i*5+1];
                        products[i].cate=result[i*5+2].catName;
						products[i].brandslug=result[i*5+3].brandSlug;
						products[i].cateslug=result[i*5+4].catSlug;
						products[i].genderslug=getGenderSlug(products[i].sex)
					}

					// lấy cái thanh featured bên sidebar
				
							const productPromises2=[
								ProductService.listByFeaturedLimit(4),
							]
						
							return Promise.all(productPromises2)
							.then(result2=>{
								let products2=result2[0];
						
								//Lấy được product
								//Giờ lấy detail của cái product đó
								const productLength2=products2.length;
								let detailPromises2=[];
						
								
							for (let i=0;i<productLength2;i++){
								detailPromises2.push(ProductService.getImageLink(products2[i].proID));
								detailPromises2.push(ProductService.getProductDetail(products2[i].proID));
								detailPromises2.push(ProductService.getCateName(products2[i].catID));
								detailPromises2.push(ProductService.getBrandSlug(products2[i].brandID));
								detailPromises2.push(ProductService.getCateSlug(products2[i].catID));
							}
						
							
							
							//Chuẩn bị render
							return Promise.all(detailPromises2)
							.then(result=>{
							
									for (let i=0;i<productLength2;i++){
										products2[i].image=result[i*5][0].proImage;
										products2[i].detail=result[i*5+1];
										products2[i].cate=result[i*5+2].catName;
										products2[i].brandslug=result[i*5+3].brandSlug;
										products2[i].cateslug=result[i*5+4].catSlug;
										products2[i].genderslug=getGenderSlug(products2[i].sex)
									}
										res.render('shop/shop',{
										products,
										products2,
										currentPage,
										totalPage,
										paginationArray,
										prevPage: (currentPage > 1) ? currentPage - 1 : 1,
										nextPage: (currentPage < totalPage) ? currentPage + 1 : totalPage,});
										
								})
								.catch(err=>{
									console.log(err);
								})
				
				
					})
					.catch(err=>{
						console.log(err);
					})
				

                   
            })
            .catch(err=>{
                console.log(err);
                next();
            })


        })
        .catch(err=>{
            console.log(err);
            next();
        })
    }


// ====== Mấy hàm này hồi đó t code để ra giao diện thôi
// ====== CODE LẠI HẾT NHA, ĐỌC TỪ DỮ LIỆU RA
//Dùng cái muốn lấy cái gì thì dùng service tương ứng
//Tạo thêm service trong thư mục Sercices nha
// t có commet trên mỗi hàm cái dòng:
//[GET] /:brand/:gender/:category/:id
//Sau dấu hai chấm chính là request á
//muốn lấy thì dùng req.params

    //Xem chi tiết sản phẩm
     //[GET] /:brand/:gender/:category/:id
    fullview(req, res, next){
        res.render("shop/fullview");
    }

    //Mấy giá trị brand, gender, category dưới này có thể là all nha
    //Khi brand là all tức là brand nào cũng lấy, tương tự với cate với gender
    //Nếu tất cả là all hết thì là ra trang shop - hiển thị tất cả sản phẩm
    //khi giá trị của brand, gender, category không phải là all á, thì nó chính là
    //cái cột slug trong cơ sở dữ liệu, dựa vào cái slug đó mà truy vấn

     //Hàm này để render ra tất cả sản phẩm trong :category 
     //Và thuộc :brand giới tính là :gender
     //Nhớ kiểm tra vụ all nói ở trên nha
     //[GET] /:brand/:gender/:category/

    shopByCategory(req, res, next){
        const brand = req.params.brand;
        const gender = req.params.gender;
        const category = req.params.category;
        if(brand !== "crazy-bunny" &&
            brand !== "crazy-rockpanda" &&
            brand !== "moustache-monster" &&
            brand !== "zombie-popsicle" &&
            brand !== "all"){
            next();
        }
        else if(gender !== "women" &&
                gender !== "men"&&
                gender !== "unisex" &&
                gender !== "all"){
            next();
        }else if(category !== "t-shirt"&&
                category !== "hat" &&
                category !== "backpack"&&
                category !== "sneaker" &&
                category !== "all"){
            next();
        }else{
            let brandUI = "";
            let genderUI = "";
            let categoryUI = "";
            
           if(category === "all"){
               if(gender === "all"){
                   if(brand === "all"){
                       res.redirect("/shop");
                   }else{
                    res.redirect("/shop/" + brand);
                   }
               }
               else{
                    res.redirect("/shop/" + brand + "/" + gender);
               }
           }
           else{
                if(brand === "all"){
                    brandUI = null;
                }else{
                    brandUI = util.getUIBrandName(brand);
                }

                if(gender === "all"){
                    genderUI = null;
                }else{
                    genderUI = util.getUIgender(gender);
                }
                categoryUI = util.getUICategory(category);

				shopbycate(req,res,next,brand,gender,category);

           }
        }
            
    }

     //Hàm này để render ra tất cả sản phẩm giới tính :gender 
     //Và thuộc :brand
     //Nhớ kiểm tra vụ all nói ở trên nha
    //[GET] /:brand/:gender

	



    shopByGender(req, res, next){
        const brand = req.params.brand;
        const gender = req.params.gender;
        if(brand !== "crazy-bunny" &&
        brand !== "crazy-rockpanda" &&
        brand !== "moustache-monster" &&
        brand !== "zombie-popsicle" &&
        brand !== "all"){
        next();
    }
    else if(gender !== "women" &&
            gender !== "men"&&
            gender !== "unisex" &&
            gender !== "all"){
        next();
    }else{
            if(brand === 'all'){
                if(gender === 'all'){
                    res.redirect("/shop");
                }
                else{
                    shopbysex(req,res,next,gender,brand); 
                }
            }
            else{
                if(gender === 'all'){
                    res.redirect("/shop/" + brand);
                }
                else{
                    res.render('shop/' + gender,{
                        brand : util.getUIBrandName(brand),
                        gender : util.getUIgender(gender),
                        link: "/shop/" +brand + "/" +gender
                    });
                }
            }
        }
    }

    //Hàm này render ra tất cả sản phẩm của một :brand
    //[GET] /:brand
    shopByBrand(req, res, next){
        const brand = req.params.brand;
        if(brand !== "crazy-bunny" &&
        brand !== "crazy-rockpanda" &&
        brand !== "moustache-monster" &&
        brand !== "zombie-popsicle" &&
        brand !== "all"){
            next();
        }
        else{
            if(brand === "all"){
                res.redirect("/shop");
            }
			shopbybrand(req,res,next,brand);
        }
    }
}

function shopbycate(req,res,next,brand,gender,category) {
	//Dùng query lấy page
	const pageNumber=req.query.page;
	let name=null;
	

	currentPage =(pageNumber && !Number.isNaN(pageNumber)) ? parseInt(pageNumber) : 1;
	currentPage = (currentPage > 0) ? currentPage : 1;
	currentPage = (currentPage <= totalPage) ? currentPage : totalPage;

	let cateID=0;

	const catePormises=[
		ProductService.getCateID(category),
	]

	Promise.all(catePormises)
	.then(resultID=>{
		cateID=resultID[0].CatID;

	console.log(cateID);


	const productPromises=[
		ProductService.listByCate(itemPerPage,currentPage,cateID),
		ProductService.getProductTotalCate(cateID),
	]


	//đợi promises
	Promise.all(productPromises)
	.then(result=>{
		let products=result[0];
		const totalProduct=result[1];

		
	  
		//Lấy max số trang
		totalPage=Math.ceil(totalProduct/itemPerPage);

		let paginationArray = [];

		let pageDisplace = Math.min(totalPage - currentPage + 2, maximumPagination);
		if(currentPage === 1){
			pageDisplace -= 1;
		}
		for(let i = 0 ; i < pageDisplace; i++){
			if(currentPage === 1){
				paginationArray.push({
					page: currentPage + i,
					isCurrent:  (currentPage + i)===currentPage
				});
			}
			else{
				paginationArray.push({
					page: currentPage + i - 1,
					isCurrent:  (currentPage + i - 1)===currentPage
				});
			}
		}
		if(pageDisplace < 2){
			paginationArray=[];
		}


		//Lấy được product
		//Giờ lấy detail của cái product đó

		const productLength=products.length;
		let detailPromises=[];

		
		console.log(products);
		for (let i=0;i<productLength;i++){
			detailPromises.push(ProductService.getImageLink(products[i].proID));
			detailPromises.push(ProductService.getProductDetail(products[i].proID));
			detailPromises.push(ProductService.getCateName(products[i].catID));
			detailPromises.push(ProductService.getBrandSlug(products[i].brandID));
			detailPromises.push(ProductService.getCateSlug(products[i].catID));
		}

		
		
		//Chuẩn bị render
		Promise.all(detailPromises)
		.then(result=>{
		
				for (let i=0;i<productLength;i++){
					products[i].image=result[i*5][0].proImage;
					products[i].detail=result[i*5+1];
					products[i].cate=result[i*5+2].catName;
					products[i].brandslug=result[i*5+3].brandSlug;
					products[i].cateslug=result[i*5+4].catSlug;
					products[i].genderslug=getGenderSlug(products[i].sex)
				}
							// lấy cái thanh featured bên sidebar
				
							const productPromises2=[
								ProductService.listByFeaturedLimit(4),
							]
						
							return Promise.all(productPromises2)
							.then(result2=>{
								let products2=result2[0];
						
								//Lấy được product
								//Giờ lấy detail của cái product đó
								const productLength2=products2.length;
								let detailPromises2=[];
						
								
							for (let i=0;i<productLength2;i++){
								detailPromises2.push(ProductService.getImageLink(products2[i].proID));
								detailPromises2.push(ProductService.getProductDetail(products2[i].proID));
								detailPromises2.push(ProductService.getCateName(products2[i].catID));
								detailPromises2.push(ProductService.getBrandSlug(products2[i].brandID));
								detailPromises2.push(ProductService.getCateSlug(products2[i].catID));
							}
						
							
							
							//Chuẩn bị render
							return Promise.all(detailPromises2)
							.then(result=>{
							
									for (let i=0;i<productLength2;i++){
										products2[i].image=result[i*5][0].proImage;
										products2[i].detail=result[i*5+1];
										products2[i].cate=result[i*5+2].catName;
										products2[i].brandslug=result[i*5+3].brandSlug;
										products2[i].cateslug=result[i*5+4].catSlug;
										products2[i].genderslug=getGenderSlug(products2[i].sex)
									}
										res.render("shop/category",{
										products,
										products2,
										currentPage,
										totalPage,
										paginationArray,
										prevPage: (currentPage > 1) ? currentPage - 1 : 1,
										nextPage: (currentPage < totalPage) ? currentPage + 1 : totalPage,
										brand: getDataSlug(brand),
										gender: getDataSlug(gender),
										category: getDataSlug(category),
										link: "/shop/" +brand + "/" +gender + "/" + category
										})
										
								})
								.catch(err=>{
									console.log(err);
								})
				
				
					})
					.catch(err=>{
						console.log(err);
					})
				

			
				    
		})
		.catch(err=>{
			console.log(err);
			next();
		})


	})
	.catch(err=>{
		console.log(err);
		next();
	})
	})
	.catch(err=>{
		console.log(err);
		next();
	})


	
}



function shopbybrand(req,res,next,brand) {
	//Dùng query lấy page
	const pageNumber=req.query.page;
	let name=null;
	

	currentPage =(pageNumber && !Number.isNaN(pageNumber)) ? parseInt(pageNumber) : 1;
	currentPage = (currentPage > 0) ? currentPage : 1;
	currentPage = (currentPage <= totalPage) ? currentPage : totalPage;

	let brandID=0;

	const brandPormises=[
		ProductService.getBrandID(brand),
	]

	Promise.all(brandPormises)
	.then(resultID=>{
		brandID=resultID[0].brandID;

	console.log(brandID);


	const productPromises=[
		ProductService.listByBrand(itemPerPage,currentPage,brandID),
		ProductService.getProductTotalBrand(brandID),
	]


	//đợi promises
	Promise.all(productPromises)
	.then(result=>{
		let products=result[0];
		const totalProduct=result[1];

		
	  
		//Lấy max số trang
		totalPage=Math.ceil(totalProduct/itemPerPage);

		let paginationArray = [];

		let pageDisplace = Math.min(totalPage - currentPage + 2, maximumPagination);
		if(currentPage === 1){
			pageDisplace -= 1;
		}
		for(let i = 0 ; i < pageDisplace; i++){
			if(currentPage === 1){
				paginationArray.push({
					page: currentPage + i,
					isCurrent:  (currentPage + i)===currentPage
				});
			}
			else{
				paginationArray.push({
					page: currentPage + i - 1,
					isCurrent:  (currentPage + i - 1)===currentPage
				});
			}
		}
		if(pageDisplace < 2){
			paginationArray=[];
		}


		//Lấy được product
		//Giờ lấy detail của cái product đó

		const productLength=products.length;
		let detailPromises=[];

		
		console.log(products);
		for (let i=0;i<productLength;i++){
			detailPromises.push(ProductService.getImageLink(products[i].proID));
			detailPromises.push(ProductService.getProductDetail(products[i].proID));
			detailPromises.push(ProductService.getCateName(products[i].catID));
			detailPromises.push(ProductService.getBrandSlug(products[i].brandID));
			detailPromises.push(ProductService.getCateSlug(products[i].catID));
		}

		
		
		//Chuẩn bị render
		Promise.all(detailPromises)
		.then(result=>{
		
				for (let i=0;i<productLength;i++){
					products[i].image=result[i*5][0].proImage;
					products[i].detail=result[i*5+1];
					products[i].cate=result[i*5+2].catName;
					products[i].brandslug=result[i*5+3].brandSlug;
					products[i].cateslug=result[i*5+4].catSlug;
					products[i].genderslug=getGenderSlug(products[i].sex)
				}

					// lấy cái thanh featured bên sidebar
				
					const productPromises2=[
						ProductService.listByFeaturedLimit(4),
					]
				
					return Promise.all(productPromises2)
					.then(result2=>{
						let products2=result2[0];
				
						//Lấy được product
						//Giờ lấy detail của cái product đó
						const productLength2=products2.length;
						let detailPromises2=[];
				
						
					for (let i=0;i<productLength2;i++){
						detailPromises2.push(ProductService.getImageLink(products2[i].proID));
						detailPromises2.push(ProductService.getProductDetail(products2[i].proID));
						detailPromises2.push(ProductService.getCateName(products2[i].catID));
						detailPromises2.push(ProductService.getBrandSlug(products2[i].brandID));
						detailPromises2.push(ProductService.getCateSlug(products2[i].catID));
					}
				
					
					
					//Chuẩn bị render
					return Promise.all(detailPromises2)
					.then(result=>{
					
							for (let i=0;i<productLength2;i++){
								products2[i].image=result[i*5][0].proImage;
								products2[i].detail=result[i*5+1];
								products2[i].cate=result[i*5+2].catName;
								products2[i].brandslug=result[i*5+3].brandSlug;
								products2[i].cateslug=result[i*5+4].catSlug;
								products2[i].genderslug=getGenderSlug(products2[i].sex)
							}
								res.render('shop/brand', {
								products,
								products2,
								currentPage,
								totalPage,
								paginationArray,
								prevPage: (currentPage > 1) ? currentPage - 1 : 1,
								nextPage: (currentPage < totalPage) ? currentPage + 1 : totalPage,
								brand : util.getDataSlug(brand),
								link: "/shop/" + brand
								});
								
						})
						.catch(err=>{
							console.log(err);
						})
		
		
			})
			.catch(err=>{
				console.log(err);
			})
				    
			

		})
		.catch(err=>{
			console.log(err);
			next();
		})


	})
	.catch(err=>{
		console.log(err);
		next();
	})
	})
	.catch(err=>{
		console.log(err);
		next();
	})


	
}


function shopbysex(req,res,next,gender,brand) {
	//Dùng query lấy page
	const pageNumber=req.query.page;
	let name=null;
	
	let sex=2;
	if (gender==="women")
		sex=1;
	if (gender==="men")
		sex=0;

	currentPage =(pageNumber && !Number.isNaN(pageNumber)) ? parseInt(pageNumber) : 1;
	currentPage = (currentPage > 0) ? currentPage : 1;
	currentPage = (currentPage <= totalPage) ? currentPage : totalPage;

	const productPromises=[
		ProductService.listByGender(itemPerPage,currentPage,sex),
		ProductService.getProductTotalGender(sex),
	]


	//đợi promises
	Promise.all(productPromises)
	.then(result=>{
		let products=result[0];
		const totalProduct=result[1];


	  
		//Lấy max số trang
		totalPage=Math.ceil(totalProduct/itemPerPage);

		let paginationArray = [];

		let pageDisplace = Math.min(totalPage - currentPage + 2, maximumPagination);
		if(currentPage === 1){
			pageDisplace -= 1;
		}
		for(let i = 0 ; i < pageDisplace; i++){
			if(currentPage === 1){
				paginationArray.push({
					page: currentPage + i,
					isCurrent:  (currentPage + i)===currentPage
				});
			}
			else{
				paginationArray.push({
					page: currentPage + i - 1,
					isCurrent:  (currentPage + i - 1)===currentPage
				});
			}
		}
		if(pageDisplace < 2){
			paginationArray=[];
		}


		//Lấy được product
		//Giờ lấy detail của cái product đó

		const productLength=products.length;
		let detailPromises=[];

		
		console.log(products);
		for (let i=0;i<productLength;i++){
			detailPromises.push(ProductService.getImageLink(products[i].proID));
			detailPromises.push(ProductService.getProductDetail(products[i].proID));
			detailPromises.push(ProductService.getCateName(products[i].catID));
			detailPromises.push(ProductService.getBrandSlug(products[i].brandID));
			detailPromises.push(ProductService.getCateSlug(products[i].catID));
		}

		
		
		//Chuẩn bị render
		Promise.all(detailPromises)
		.then(result=>{
		
				for (let i=0;i<productLength;i++){
					products[i].image=result[i*5][0].proImage;
					products[i].detail=result[i*5+1];
					products[i].cate=result[i*5+2].catName;
					products[i].brandslug=result[i*5+3].brandSlug;
					products[i].cateslug=result[i*5+4].catSlug;
					products[i].genderslug=getGenderSlug(products[i].sex)
				}
						// lấy cái thanh featured bên sidebar
				
						const productPromises2=[
							ProductService.listByFeaturedLimit(4),
						]
					
						return Promise.all(productPromises2)
						.then(result2=>{
							let products2=result2[0];
					
							//Lấy được product
							//Giờ lấy detail của cái product đó
							const productLength2=products2.length;
							let detailPromises2=[];
					
							
						for (let i=0;i<productLength2;i++){
							detailPromises2.push(ProductService.getImageLink(products2[i].proID));
							detailPromises2.push(ProductService.getProductDetail(products2[i].proID));
							detailPromises2.push(ProductService.getCateName(products2[i].catID));
							detailPromises2.push(ProductService.getBrandSlug(products2[i].brandID));
							detailPromises2.push(ProductService.getCateSlug(products2[i].catID));
						}
					
						
						
						//Chuẩn bị render
						return Promise.all(detailPromises2)
						.then(result=>{
						
								for (let i=0;i<productLength2;i++){
									products2[i].image=result[i*5][0].proImage;
									products2[i].detail=result[i*5+1];
									products2[i].cate=result[i*5+2].catName;
									products2[i].brandslug=result[i*5+3].brandSlug;
									products2[i].cateslug=result[i*5+4].catSlug;
									products2[i].genderslug=getGenderSlug(products2[i].sex)
								}
									res.render('shop/' + gender,{
									products,
									products2,
									currentPage,
									totalPage,
									paginationArray,
									prevPage: (currentPage > 1) ? currentPage - 1 : 1,
									nextPage: (currentPage < totalPage) ? currentPage + 1 : totalPage,
									brand : util.getUIBrandName(brand),
									gender : util.getUIgender(gender),
									link: "/shop/" +brand + "/" +gender
									})
									
							})
							.catch(err=>{
								console.log(err);
							})
			
			
				})
				.catch(err=>{
					console.log(err);
				})

			
		})
		.catch(err=>{
			console.log(err);
			next();
		})


	})
	.catch(err=>{
		console.log(err);
		next();
	})
}

function getGenderSlug(sex) {
	let gender="unisex";
	if (sex==1)
		gender="women";
	if (sex==0)
		gender="men";
	return gender;
}

function getFeaturedList(){

	
}

module.exports = new ShopController;